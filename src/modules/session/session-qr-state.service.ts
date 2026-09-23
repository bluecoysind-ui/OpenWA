import { Injectable } from '@nestjs/common';

/** WhatsApp rotates pairing QRs on roughly this cadence. */
export const SESSION_QR_TTL_MS = 20_000;

/** Phone pairing codes are valid for about three minutes on WhatsApp Web. */
export const SESSION_PAIRING_CODE_TTL_MS = 180_000;

type QrEntry = { qr: string; expiresAt: number };
type PairingEntry = { code: string; phone: string; expiresAt: number };

/** In-memory QR and pairing expiry hints keyed by session id (refreshed on each engine QR). */
@Injectable()
export class SessionQrStateService {
  private readonly qrBySession = new Map<string, QrEntry>();
  private readonly pairingBySession = new Map<string, PairingEntry>();

  /**
   * Record a QR string and return when it is expected to rotate. Reuses the existing deadline while
   * the payload is unchanged so polling does not reset the countdown.
   */
  touchQr(sessionId: string, qr: string): number {
    const now = Date.now();
    const existing = this.qrBySession.get(sessionId);
    if (existing && existing.qr === qr && existing.expiresAt > now) {
      return existing.expiresAt;
    }
    const expiresAt = now + SESSION_QR_TTL_MS;
    this.qrBySession.set(sessionId, { qr, expiresAt });
    // A fresh QR invalidates any prior phone pairing code on the WhatsApp side.
    this.pairingBySession.delete(sessionId);
    return expiresAt;
  }

  getQrExpiry(sessionId: string): number | null {
    const entry = this.qrBySession.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.qrBySession.delete(sessionId);
      return null;
    }
    return entry.expiresAt;
  }

  setPairing(sessionId: string, code: string, phone: string): number {
    const expiresAt = Date.now() + SESSION_PAIRING_CODE_TTL_MS;
    this.pairingBySession.set(sessionId, { code, phone, expiresAt });
    return expiresAt;
  }

  getPairing(sessionId: string): { pairingCode: string; pairingPhone: string; pairingExpiresAt: number } | null {
    const entry = this.pairingBySession.get(sessionId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.pairingBySession.delete(sessionId);
      return null;
    }
    return {
      pairingCode: entry.code,
      pairingPhone: entry.phone,
      pairingExpiresAt: entry.expiresAt,
    };
  }

  clear(sessionId: string): void {
    this.qrBySession.delete(sessionId);
    this.pairingBySession.delete(sessionId);
  }
}
