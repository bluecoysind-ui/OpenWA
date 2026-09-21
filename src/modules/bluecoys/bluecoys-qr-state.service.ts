import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** In-memory QR expiry hints keyed by session id (refreshed on each session:qr hook). */
@Injectable()
export class BluecoysQrStateService {
  private readonly expiryBySession = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  markQrIssued(sessionId: string): void {
    const ttlMs = this.config.get<number>('bluecoys.qrTtlMs') ?? 20_000;
    this.expiryBySession.set(sessionId, Date.now() + ttlMs);
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

  clear(sessionId: string): void {
    this.expiryBySession.delete(sessionId);
  }
}
