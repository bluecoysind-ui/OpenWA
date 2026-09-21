import { Repository } from 'typeorm';
import { WebhookDeliveryLog, WebhookDeliveryStatus } from '../entities/webhook-delivery-log.entity';

const SNIPPET_MAX = 200;
const KEEP_PER_WEBHOOK = 500;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export interface WebhookDeliveryAttemptInput {
  webhookId: string;
  sessionId: string;
  status: WebhookDeliveryStatus;
  httpCode?: number | null;
  durationMs: number;
  attempt: number;
  errorSnippet?: string | null;
}

/**
 * Persist one HTTP attempt (Q6). Never request/response bodies. Best-effort: a bookkeeping
 * failure must not retry an already-POSTed webhook or poison the delivery result.
 */
export async function recordWebhookDeliveryAttempt(
  repo: Repository<WebhookDeliveryLog> | undefined,
  input: WebhookDeliveryAttemptInput,
): Promise<void> {
  if (!repo) return;
  try {
    const errorSnippet = input.errorSnippet ? input.errorSnippet.replace(/\s+/g, ' ').slice(0, SNIPPET_MAX) : null;
    await repo.save(
      repo.create({
        webhookId: input.webhookId,
        sessionId: input.sessionId,
        status: input.status,
        httpCode: input.httpCode ?? null,
        durationMs: input.durationMs,
        attempt: input.attempt,
        errorSnippet,
      }),
    );
    await trimDeliveryLog(repo, input.webhookId);
  } catch {
    /* never throw into the delivery result */
  }
}

export async function trimDeliveryLog(repo: Repository<WebhookDeliveryLog>, webhookId: string): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  await repo
    .createQueryBuilder()
    .delete()
    .where('webhookId = :webhookId AND createdAt < :cutoff', { webhookId, cutoff })
    .execute();
  const extra = await repo.find({
    where: { webhookId },
    order: { createdAt: 'DESC' },
    skip: KEEP_PER_WEBHOOK,
    take: 200,
  });
  if (extra.length > 0) await repo.remove(extra);
}

export { KEEP_PER_WEBHOOK, RETENTION_MS };
