import { Injectable } from '@nestjs/common';
import { createLogger } from '../../common/services/logger.service';
import { digitsOnlyPhone } from './bluecoys-phone';
import {
  BLUECOYS_CALLBACK_TIMEOUT_MS,
  BLUECOYS_DISCONNECTED_CALLBACK_URL,
  BLUECOYS_LINKED_CALLBACK_URL,
} from './bluecoys.constants';

/**
 * Outbound reward callbacks to the Bluecoys app. The URLs are fixed in bluecoys.constants.ts.
 *
 * Failures are LOGGED, never thrown: a callback hiccup must not break the WhatsApp session that
 * triggered it. Both callbacks are idempotent on the Bluecoys side (keyed on the phone number), so
 * a duplicate delivery is harmless.
 */
@Injectable()
export class BluecoysCallbackService {
  private readonly logger = createLogger('BluecoysCallback');

  /** POST /api/whatsapp-linked — Bluecoys credits the login reward to `username`. */
  async notifyLinked(phone: string, username: string): Promise<void> {
    const phoneNumber = digitsOnlyPhone(phone);
    const url = `${BLUECOYS_LINKED_CALLBACK_URL}?phone_number=${encodeURIComponent(phoneNumber)}`;
    await this.post(url, { phone_number: phoneNumber, username });
  }

  /** GET /api/whatsapp-disconnected — Bluecoys reverses the reward for this number. */
  async notifyDisconnected(phone: string): Promise<void> {
    const phoneNumber = digitsOnlyPhone(phone);
    const url = `${BLUECOYS_DISCONNECTED_CALLBACK_URL}?phone_number=${encodeURIComponent(phoneNumber)}`;
    await this.get(url);
  }

  private async post(url: string, body: Record<string, string>): Promise<void> {
    await this.request(
      'POST',
      url,
      {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      'bluecoys_linked_callback',
    );
  }

  private async get(url: string): Promise<void> {
    await this.request('GET', url, {}, 'bluecoys_disconnected_callback');
  }

  private async request(method: 'GET' | 'POST', url: string, init: RequestInit, action: string): Promise<void> {
    try {
      const res = await fetch(url, {
        method,
        ...init,
        signal: AbortSignal.timeout(BLUECOYS_CALLBACK_TIMEOUT_MS),
      });
      if (!res.ok) {
        const snippet = await this.readBodySnippet(res);
        this.logger.warn('Bluecoys callback failed', {
          action,
          status: res.status,
          statusText: res.statusText,
          body: snippet,
        });
      }
    } catch (error) {
      this.logger.warn('Bluecoys callback error', {
        action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async readBodySnippet(res: Response): Promise<string> {
    try {
      const text = await res.text();
      return text.length > 200 ? `${text.slice(0, 200)}…` : text;
    } catch {
      return '';
    }
  }
}
