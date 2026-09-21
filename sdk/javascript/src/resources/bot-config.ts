/**
 * Per-session bot config — access lists, prefix, commands, autoRead, welcome.
 *
 * Backed by `src/modules/bot/bot-config.controller.ts`.
 * @packageDocumentation
 */

import { encodeSegment } from '../http.js';
import type { OpenWAClient } from '../client.js';

export interface BotConfigRecord {
  sessionId: string;
  accessMode: 'all' | 'allow' | 'block';
  allowList: string[];
  blockList: string[];
  prefix: string;
  commandsEnabled: boolean;
  autoRead: boolean;
  alwaysOnline: boolean;
  welcomeMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateBotConfigRequest = Partial<
  Omit<BotConfigRecord, 'sessionId' | 'createdAt' | 'updatedAt'>
>;

export class BotConfigResource {
  constructor(private readonly client: OpenWAClient) {}

  get(sessionId: string): Promise<BotConfigRecord> {
    return this.client.request({
      method: 'GET',
      path: `/api/sessions/${encodeSegment(sessionId)}/bot-config`,
    });
  }

  update(sessionId: string, body: UpdateBotConfigRequest): Promise<BotConfigRecord> {
    return this.client.request({
      method: 'PUT',
      path: `/api/sessions/${encodeSegment(sessionId)}/bot-config`,
      body,
    });
  }
}
