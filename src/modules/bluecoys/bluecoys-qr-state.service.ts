import { Injectable } from '@nestjs/common';
import { BLUECOYS_QR_TTL_MS } from './bluecoys.constants';

/**
 * WhatsApp pairing codes are short-lived: the phone must enter one within a couple of minutes or
 * WhatsApp rejects it. We cache the issued code for this long so repeated frontend polls return the
 * SAME code — re-requesting mints a fresh one and silently invalidates the code the user is mid-way
 * through typing. Once it lapses, the next poll transparently issues a new one.
 */
const PAIRING_CODE_TTL_MS = 120_000;

/**
 * In-memory, per-session ephemeral link state for the Bluecoys flow:
 *  - QR expiry hints (refreshed on each session:qr hook / QR fetch), and
 *  - the last-issued phone pairing code (so polling returns a stable code, not a new one per call).
 *
 * Everything here is a best-effort hint that lives only in this process and is cleared when the
 * session links or disconnects. Nothing here is a source of truth — the Session row is.
 */
@Injectable()
export class BluecoysQrStateService {
  private readonly expiryBySession = new Map<string, number>();
  private readonly pairingBySession = new Map<string, { code: string; expiresAt: number }>();

  // ── QR ────────────────────────────────────────────────────────────────────────────────────────

  markQrIssued(sessionId: string): void {
    this.expiryBySession.set(sessionId, Date.now() + BLUECOYS_QR_TTL_MS);
  }

  getExpiry(sessionId: string): number | null {
    const at = this.expiryBySession.get(sessionId);
    if (!at) return null;
    if (at <= Date.now()) {
      this.expiryBySession.delete(sessionId);
      return null;
    }
    return at;
  }

  // ── Phone pairing code ────────────────────────────────────────────────────────────────────────

  /** Remember the pairing code just issued for this session (see PAIRING_CODE_TTL_MS). */
  setPairingCode(sessionId: string, code: string): void {
    this.pairingBySession.set(sessionId, { code, expiresAt: Date.now() + PAIRING_CODE_TTL_MS });
  }

  /** The still-valid cached pairing code for this session, or null once it lapsed / was never set. */
  getPairingCode(sessionId: string): string | null {
    const entry = this.pairingBySession.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.pairingBySession.delete(sessionId);
      return null;
    }
    return entry.code;
  }

  /** When the cached pairing code lapses (epoch ms); same expiry bookkeeping as getPairingCode. */
  getPairingExpiry(sessionId: string): number | null {
    const entry = this.pairingBySession.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.pairingBySession.delete(sessionId);
      return null;
    }
    return entry.expiresAt;
  }

  // ── Both ──────────────────────────────────────────────────────────────────────────────────────

  /** Drop every hint for a session — called once it links or terminally disconnects. */
  clear(sessionId: string): void {
    this.expiryBySession.delete(sessionId);
    this.pairingBySession.delete(sessionId);
  }
}
