import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { setTimeout } from 'node:timers/promises';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from '../session/entities/session.entity';
import { SessionService } from '../session/session.service';
import { LinkQrResponseDto } from './dto/link-qr-response.dto';
import { LinkCodeResponseDto } from './dto/link-code-response.dto';
import { BLUECOYS_CONFIG_PHONE, BLUECOYS_CONFIG_USERNAME } from './bluecoys.types';
import { BLUECOYS_LINK_TOKEN, BLUECOYS_QR_TTL_MS } from './bluecoys.constants';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';
import { linkTokensMatch } from './bluecoys-link-token';
import { digitsOnlyPhone, sessionNameForUsername } from './bluecoys-phone';
import { phonesMatch, readBluecoysConfig } from './bluecoys-session.util';

/** The "already linked" success payload — identical for the QR and pairing-code responses. */
type LinkedResult = { sessionId: string; phoneNumber: string; username: string };

/**
 * prepareSession()'s outcome: either the account is ALREADY linked (terminal — the caller returns
 * it as-is), or we hold a started, not-yet-linked session ready to hand out a QR / pairing code.
 */
type PrepareResult = { linked: LinkedResult } | { session: Session; expectedPhone: string };

/**
 * How long each login route waits for the engine to produce its credential before answering 504
 * (the client simply retries). QR needs the engine to reach QR_READY; pairing only needs the socket
 * open, so it can give up sooner.
 */
const QR_POLL_DEADLINE_MS = 60_000;
const PAIRING_POLL_DEADLINE_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;

function stripDataUrl(qrCode: string): string {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(qrCode);
  return match ? match[1] : qrCode;
}

/**
 * Bluecoys login flows. Each public method backs one route in bluecoys.controller.ts and follows
 * the same shape:
 *
 *   1. prepareSession()  → find/create the user's session, reject binding conflicts, start it,
 *                          or short-circuit with `linked: true` if it is already linked.
 *   2. poll the engine   → hand out the credential (QR image / pairing code) as soon as the engine
 *                          can produce it, or `linked: true` if the account linked meanwhile.
 *
 * The reward callbacks are NOT fired from here — bluecoys-hooks.service.ts does that from the
 * session:ready / session:disconnected hooks, so they work whichever method linked the account.
 *
 * To add another login method: add a `getLinkXxx()` here that calls prepareSession() and then
 * whatever SessionService call yields the new credential, plus a DTO and a controller route.
 */
@Injectable()
export class BluecoysLinkService {
  constructor(
    private readonly sessions: SessionService,
    private readonly qrState: BluecoysQrStateService,
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /** Optional shared-secret gate (BLUECOYS_LINK_TOKEN in bluecoys.constants.ts). No-op while empty. */
  assertLinkToken(token: string | undefined): void {
    if (!linkTokensMatch(BLUECOYS_LINK_TOKEN, token)) {
      throw new UnauthorizedException('Invalid link token');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GET /api/whatsapp/link-qr — QR-image login
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  async getLinkQr(username: string, phoneNumber: string): Promise<LinkQrResponseDto> {
    const prep = await this.prepareSession(username, phoneNumber);
    if ('linked' in prep) {
      return { linked: true, ...prep.linked };
    }
    let { session } = prep;
    const { expectedPhone } = prep;

    const deadline = Date.now() + QR_POLL_DEADLINE_MS;
    while (Date.now() < deadline) {
      // Linked (from a QR issued on an earlier poll) while we were away?
      session = await this.sessions.findOne(session.id);
      if (session.status === SessionStatus.READY && session.phone) {
        if (!phonesMatch(expectedPhone, session.phone)) {
          throw new ConflictException('A different WhatsApp account was linked');
        }
        return {
          linked: true,
          sessionId: session.id,
          phoneNumber: digitsOnlyPhone(session.phone),
          username,
        };
      }

      try {
        const { qrCode } = await this.sessions.getQRCode(session.id);
        this.qrState.markQrIssued(session.id);
        const qrExpiresAt = this.qrState.getExpiry(session.id) ?? Date.now() + BLUECOYS_QR_TTL_MS;
        return {
          linked: false,
          sessionId: session.id,
          username,
          qrCodeBase64: stripDataUrl(qrCode),
          qrExpiresAt,
        };
      } catch (error) {
        // 'already authenticated' = it linked between the READY check above and this call.
        if (error instanceof BadRequestException && error.message.includes('already authenticated')) {
          const linked = await this.linkedIfPhoneMatches(session.id, expectedPhone, username);
          if (linked) return { linked: true, ...linked };
          throw new ConflictException('Session authenticated with an unexpected number');
        }
        // QR not generated yet (engine still initialising) — wait and retry.
        await setTimeout(POLL_INTERVAL_MS);
      }
    }

    throw new GatewayTimeoutException('QR code not ready yet; retry in a few seconds');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // GET /api/whatsapp/link-code — phone-number (pairing-code) login
  //
  // Same envelope and flow as getLinkQr, but the credential is an 8-char pairing code from
  // SessionService.requestPairingCode() (→ Baileys / whatsapp-web.js) instead of a QR image.
  //
  // The code is cached in BluecoysQrStateService so repeated polls return the SAME code until it
  // lapses: asking the engine again mints a NEW code and silently invalidates the one the user is
  // typing, which would make the flow fail for anyone who polls while entering it.
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  async getLinkCode(username: string, phoneNumber: string): Promise<LinkCodeResponseDto> {
    const prep = await this.prepareSession(username, phoneNumber);
    if ('linked' in prep) {
      return { linked: true, ...prep.linked };
    }
    const { session, expectedPhone } = prep;
    const sessionId = session.id;

    // A code handed out on a previous poll that is still valid — reuse it verbatim (see above).
    const cached = this.qrState.getPairingCode(sessionId);

    const deadline = Date.now() + PAIRING_POLL_DEADLINE_MS;
    while (Date.now() < deadline) {
      // 1) Linked (from a code issued on an earlier poll) while we were away?
      const current = await this.sessions.findOne(sessionId);
      if (current.status === SessionStatus.READY && current.phone) {
        if (!phonesMatch(expectedPhone, current.phone)) {
          throw new ConflictException('A different WhatsApp account was linked');
        }
        this.qrState.clear(sessionId);
        return {
          linked: true,
          sessionId,
          phoneNumber: digitsOnlyPhone(current.phone),
          username,
        };
      }

      // 2) Still-valid cached code → return it unchanged so the user keeps typing the same one.
      if (cached) {
        return {
          linked: false,
          sessionId,
          username,
          pairingCode: cached,
          codeExpiresAt: this.qrState.getPairingExpiry(sessionId) ?? undefined,
        };
      }

      // 3) No usable code yet → ask the engine for a fresh one. Right after start() the socket may
      //    not be open, in which case requestPairingCode throws the documented "not started" /
      //    engine-not-ready error — we retry on a short cadence until it is ready or we time out.
      try {
        const { pairingCode } = await this.sessions.requestPairingCode(sessionId, expectedPhone);
        this.qrState.setPairingCode(sessionId, pairingCode);
        return {
          linked: false,
          sessionId,
          username,
          pairingCode,
          codeExpiresAt: this.qrState.getPairingExpiry(sessionId) ?? undefined,
        };
      } catch (error) {
        // 'already authenticated' = it linked between the READY check above and this call.
        if (error instanceof BadRequestException && error.message.includes('already authenticated')) {
          const linked = await this.linkedIfPhoneMatches(sessionId, expectedPhone, username);
          if (linked) return { linked: true, ...linked };
          throw new ConflictException('Session authenticated with an unexpected number');
        }
        // Engine not ready / transient transport hiccup — wait and retry.
        await setTimeout(POLL_INTERVAL_MS);
      }
    }

    throw new GatewayTimeoutException('Pairing code not ready yet; retry in a few seconds');
  }

  // ───────────────────────────────────────────────────────────────────────────────────────────────
  // Shared plumbing for every login route
  // ───────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * Resolve the per-user OpenWA session and get it into a state where a credential can be issued.
   *
   * One session per (Bluecoys user, WhatsApp number) — named `bc-<username>-<number>` — so a user
   * can link SEVERAL WhatsApp accounts and each gets its own QR/pairing, credentials and reward
   * callback. The session's `config` carries the username and the number the user CLAIMED; that
   * binding is what makes the flow safe:
   *   - a link that authenticates a DIFFERENT number is rejected (409) rather than rewarded, and
   *   - the ready/disconnected hooks can map the session back to the Bluecoys user for callbacks.
   *
   * Returns `{ linked }` when the account is ALREADY linked (both routes return that verbatim),
   * otherwise `{ session, expectedPhone }` for a started, not-yet-linked session.
   */
  private async prepareSession(username: string, phoneNumber: string): Promise<PrepareResult> {
    const expectedPhone = digitsOnlyPhone(phoneNumber);
    let name: string;
    try {
      name = sessionNameForUsername(username, expectedPhone);
    } catch {
      throw new BadRequestException('username is not usable for session naming');
    }

    const existing = await this.sessions.findAll(null, { name, limit: 1 });
    let session = existing[0];
    if (!session) {
      // First time we see this user — create the session pre-tagged with their binding.
      session = await this.sessions.create({
        name,
        config: {
          [BLUECOYS_CONFIG_USERNAME]: username,
          [BLUECOYS_CONFIG_PHONE]: expectedPhone,
        },
      });
    } else {
      // Already linked with a matching binding → terminal success (or a 409 on a mismatch).
      const prior = readBluecoysConfig(session.config);
      if (prior && session.phone && session.status === SessionStatus.READY) {
        if (!phonesMatch(prior[BLUECOYS_CONFIG_PHONE], session.phone)) {
          throw new ConflictException('This session is linked to a different phone number');
        }
        if (prior[BLUECOYS_CONFIG_USERNAME] !== username) {
          throw new ConflictException('username does not match the existing Bluecoys binding');
        }
        return { linked: { sessionId: session.id, phoneNumber: digitsOnlyPhone(session.phone), username } };
      }

      // Not linked yet (or re-linking) → refresh the binding to this request's username/phone.
      const config = {
        ...(session.config ?? {}),
        [BLUECOYS_CONFIG_USERNAME]: username,
        [BLUECOYS_CONFIG_PHONE]: expectedPhone,
      };
      await this.sessionRepository.update(session.id, { config });
      session = await this.sessions.findOne(session.id);
    }

    // Linked out-of-band already? Short-circuit (or reject a mismatched number).
    if (session.status === SessionStatus.READY && session.phone) {
      if (!phonesMatch(expectedPhone, session.phone)) {
        throw new ConflictException('Session is linked to a different WhatsApp number');
      }
      return { linked: { sessionId: session.id, phoneNumber: digitsOnlyPhone(session.phone), username } };
    }

    // Bring the engine up so it can produce a QR / accept a pairing request.
    if (!this.sessions.isActive(session.id)) {
      await this.sessions.start(session.id);
    }

    return { session, expectedPhone };
  }

  /**
   * Re-read the session and return the linked result IF it authenticated the expected number,
   * else null. Used when the engine reports 'already authenticated' mid-flow.
   */
  private async linkedIfPhoneMatches(
    sessionId: string,
    expectedPhone: string,
    username: string,
  ): Promise<LinkedResult | null> {
    const session = await this.sessions.findOne(sessionId);
    if (session.phone && phonesMatch(expectedPhone, session.phone)) {
      this.qrState.clear(sessionId);
      return { sessionId, phoneNumber: digitsOnlyPhone(session.phone), username };
    }
    return null;
  }
}
