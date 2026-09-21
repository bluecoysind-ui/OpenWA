import {
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { setTimeout } from 'node:timers/promises';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from '../session/entities/session.entity';
import { SessionService } from '../session/session.service';
import { LinkQrResponseDto } from './dto/link-qr-response.dto';
import { BLUECOYS_CONFIG_PHONE, BLUECOYS_CONFIG_USERNAME } from './bluecoys.types';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';
import { linkTokensMatch } from './bluecoys-link-token';
import { digitsOnlyPhone, sessionNameForUsername } from './bluecoys-phone';
import { phonesMatch, readBluecoysConfig } from './bluecoys-session.util';

function stripDataUrl(qrCode: string): string {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(qrCode);
  return match ? match[1] : qrCode;
}

@Injectable()
export class BluecoysLinkService {
  constructor(
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
    private readonly qrState: BluecoysQrStateService,
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
  ) {}

  assertLinkToken(token: string | undefined): void {
    const expected = this.config.get<string>('bluecoys.linkToken') ?? '';
    if (!linkTokensMatch(expected, token)) {
      throw new UnauthorizedException('Invalid link token');
    }
  }

  async getLinkQr(username: string, phoneNumber: string): Promise<LinkQrResponseDto> {
    if (this.config.get<boolean>('bluecoys.enabled') !== true) {
      throw new ServiceUnavailableException('Bluecoys integration is disabled');
    }

    const expectedPhone = digitsOnlyPhone(phoneNumber);
    let name: string;
    try {
      name = sessionNameForUsername(username);
    } catch {
      throw new BadRequestException('username is not usable for session naming');
    }

    const existing = await this.sessions.findAll(null, { name, limit: 1 });
    let session = existing[0];
    if (!session) {
      session = await this.sessions.create({
        name,
        config: {
          [BLUECOYS_CONFIG_USERNAME]: username,
          [BLUECOYS_CONFIG_PHONE]: expectedPhone,
        },
      });
    } else {
      const prior = readBluecoysConfig(session.config);
      if (prior && session.phone && session.status === SessionStatus.READY) {
        if (!phonesMatch(prior[BLUECOYS_CONFIG_PHONE], session.phone)) {
          throw new ConflictException('This session is linked to a different phone number');
        }
        if (prior[BLUECOYS_CONFIG_USERNAME] !== username) {
          throw new ConflictException('username does not match the existing Bluecoys binding');
        }
        return {
          linked: true,
          sessionId: session.id,
          phoneNumber: digitsOnlyPhone(session.phone),
          username,
        };
      }

      const config = {
        ...(session.config ?? {}),
        [BLUECOYS_CONFIG_USERNAME]: username,
        [BLUECOYS_CONFIG_PHONE]: expectedPhone,
      };
      await this.sessionRepository.update(session.id, { config });
      session = await this.sessions.findOne(session.id);
    }

    if (session.status === SessionStatus.READY && session.phone) {
      if (!phonesMatch(expectedPhone, session.phone)) {
        throw new ConflictException('Session is linked to a different WhatsApp number');
      }
      return {
        linked: true,
        sessionId: session.id,
        phoneNumber: digitsOnlyPhone(session.phone),
        username,
      };
    }

    if (!this.sessions.isActive(session.id)) {
      await this.sessions.start(session.id);
    }

    const ttlMs = this.config.get<number>('bluecoys.qrTtlMs') ?? 20_000;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
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
        const qrExpiresAt = this.qrState.getExpiry(session.id) ?? Date.now() + ttlMs;
        return {
          linked: false,
          sessionId: session.id,
          username,
          qrCodeBase64: stripDataUrl(qrCode),
          qrExpiresAt,
        };
      } catch (error) {
        if (error instanceof BadRequestException) {
          const msg = error.message;
          if (msg.includes('already authenticated')) {
            session = await this.sessions.findOne(session.id);
            if (session.phone && phonesMatch(expectedPhone, session.phone)) {
              return {
                linked: true,
                sessionId: session.id,
                phoneNumber: digitsOnlyPhone(session.phone),
                username,
              };
            }
            throw new ConflictException('Session authenticated with an unexpected number');
          }
        }
        await setTimeout(1_000);
      }
    }

    throw new GatewayTimeoutException('QR code not ready yet; retry in a few seconds');
  }
}
