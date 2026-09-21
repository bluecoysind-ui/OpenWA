import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '../../common/services/logger.service';
import { digitsOnlyPhone } from './bluecoys-phone';

@Injectable()
export class BluecoysCallbackService {
  private readonly logger = createLogger('BluecoysCallback');

  constructor(private readonly config: ConfigService) {}

  private enabled(): boolean {
    return this.config.get<boolean>('bluecoys.enabled') === true;
  }

  private baseUrl(): string {
    return (this.config.get<string>('bluecoys.baseUrl') ?? 'https://bluecoys.com').replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    return this.config.get<number>('bluecoys.callbackTimeoutMs') ?? 15_000;
  }

  async notifyLinked(phone: string, username: string): Promise<void> {
    if (!this.enabled()) return;
    const phoneNumber = digitsOnlyPhone(phone);
    const url = `${this.baseUrl()}/api/whatsapp-linked?phone_number=${encodeURIComponent(phoneNumber)}`;
    await this.post(url, { phone_number: phoneNumber, username });
  }

  async notifyDisconnected(phone: string): Promise<void> {
    if (!this.enabled()) return;
    const phoneNumber = digitsOnlyPhone(phone);
    const url = `${this.baseUrl()}/api/whatsapp-disconnected?phone_number=${encodeURIComponent(phoneNumber)}`;
    await this.get(url);
  }

  private async post(url: string, body: Record<string, string>): Promise<void> {
    await this.request('POST', url, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }, 'bluecoys_linked_callback');
  }

  private async get(url: string): Promise<void> {
    await this.request('GET', url, {}, 'bluecoys_disconnected_callback');
  }

  private async request(
    method: 'GET' | 'POST',
    url: string,
    init: RequestInit,
    action: string,
  ): Promise<void> {
    try {
      const res = await fetch(url, {
        method,
        ...init,
        signal: AbortSignal.timeout(this.timeoutMs()),
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
