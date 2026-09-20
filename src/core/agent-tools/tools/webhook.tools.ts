import { z } from 'zod';
import { ApiKeyRole } from '../../../modules/auth/entities/api-key.entity';
import type { WebhookService } from '../../../modules/webhook/webhook.service';
import { WebhookResponseDto } from '../../../modules/webhook/dto/webhook.dto';
import { defineTool, type AnyToolDescriptor } from '../tool-descriptor';

const sessionId = z.string().min(1).describe('Session UUID (the session id, not the name)');

export function webhookTools(webhook: WebhookService): AnyToolDescriptor[] {
  return [
    defineTool({
      name: 'WebhooksList',
      description:
        'List all webhooks the API key is allowed to see, across all its accessible sessions. Supports limit/offset paging.',
      tier: 'read',
      requiredRole: ApiKeyRole.OPERATOR,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(1000).optional(),
        offset: z.number().int().min(0).optional(),
      }),
      handler: (input, apiKey) =>
        webhook
          .findAll(apiKey.allowedSessions, { limit: input.limit, offset: input.offset })
          .then(ws => WebhookResponseDto.fromEntities(ws)),
    }),
    defineTool({
      name: 'WebhookFindBySession',
      description: 'List all webhooks registered for a specific session.',
      tier: 'read',
      requiredRole: ApiKeyRole.OPERATOR,
      sessionScoped: true,
      inputSchema: z.object({ sessionId }),
      handler: input => webhook.findBySession(input.sessionId).then(ws => WebhookResponseDto.fromEntities(ws)),
    }),
    defineTool({
      name: 'WebhookFindOne',
      description: 'Get details for a specific webhook by ID within a session.',
      tier: 'read',
      requiredRole: ApiKeyRole.OPERATOR,
      sessionScoped: true,
      inputSchema: z.object({
        sessionId,
        webhookId: z.string().describe('Webhook UUID'),
      }),
      handler: input => webhook.findOne(input.sessionId, input.webhookId).then(w => WebhookResponseDto.fromEntity(w)),
    }),
    defineTool({
      name: 'WebhookListDeliveries',
      description:
        'List recent delivery attempts for a webhook (status, HTTP code, duration, attempt, error snippet). ' +
        'Never includes request or response bodies.',
      tier: 'read',
      requiredRole: ApiKeyRole.OPERATOR,
      sessionScoped: true,
      inputSchema: z.object({
        sessionId,
        webhookId: z.string().min(1).describe('Webhook UUID'),
      }),
      handler: input =>
        webhook.listDeliveries(input.sessionId, input.webhookId).then(rows =>
          rows.map(row => ({
            id: row.id,
            status: row.status,
            httpCode: row.httpCode,
            durationMs: row.durationMs,
            attempt: row.attempt,
            errorSnippet: row.errorSnippet,
            createdAt: row.createdAt,
          })),
        ),
    }),
  ];
}
