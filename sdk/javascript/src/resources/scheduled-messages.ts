/**
 * Scheduled messages — one-shot and recurring delayed sends.
 *
 * Backed by `src/modules/scheduler/scheduler.controller.ts`.
 * @packageDocumentation
 */

import { encodeSegment } from '../http.js';
import type { OpenWAClient } from '../client.js';

export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CreateScheduledMessageRequest {
  chatId: string;
  /** ISO-8601 instant with offset (Z or ±HH:MM). */
  sendAt: string;
  timezone?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video' | 'document' | 'audio';
  caption?: string;
  recurrence?: RecurrenceKind;
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  until?: string;
  maxOccurrences?: number;
}

export type UpdateScheduledMessageRequest = Partial<CreateScheduledMessageRequest> & {
  status?: 'pending' | 'paused';
};

export interface ScheduledMessageRecord {
  id: string;
  sessionId: string;
  chatId: string;
  sendAt: string;
  timezone: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: string;
  caption: string | null;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'paused';
  recurrence: RecurrenceKind;
  interval: number;
  daysOfWeek: number[] | null;
  dayOfMonth: number | null;
  until: string | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
  attemptCount: number;
  lastError: string | null;
  sentMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ScheduledMessagesResource {
  constructor(private readonly client: OpenWAClient) {}

  list(sessionId: string): Promise<ScheduledMessageRecord[]> {
    return this.client.request({
      method: 'GET',
      path: `/api/sessions/${encodeSegment(sessionId)}/scheduled-messages`,
    });
  }

  create(sessionId: string, body: CreateScheduledMessageRequest): Promise<ScheduledMessageRecord> {
    return this.client.request({
      method: 'POST',
      path: `/api/sessions/${encodeSegment(sessionId)}/scheduled-messages`,
      body,
    });
  }

  get(sessionId: string, jobId: string): Promise<ScheduledMessageRecord> {
    return this.client.request({
      method: 'GET',
      path: `/api/sessions/${encodeSegment(sessionId)}/scheduled-messages/${encodeSegment(jobId)}`,
    });
  }

  update(sessionId: string, jobId: string, body: UpdateScheduledMessageRequest): Promise<ScheduledMessageRecord> {
    return this.client.request({
      method: 'PATCH',
      path: `/api/sessions/${encodeSegment(sessionId)}/scheduled-messages/${encodeSegment(jobId)}`,
      body,
    });
  }

  delete(sessionId: string, jobId: string): Promise<void> {
    return this.client.request({
      method: 'DELETE',
      path: `/api/sessions/${encodeSegment(sessionId)}/scheduled-messages/${encodeSegment(jobId)}`,
    });
  }
}
