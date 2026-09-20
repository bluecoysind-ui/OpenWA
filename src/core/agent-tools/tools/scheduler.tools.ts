import { z } from 'zod';
import { ApiKeyRole } from '../../../modules/auth/entities/api-key.entity';
import { MESSAGE_TEXT_MAX_LENGTH } from '../../../modules/message/dto/send-message.dto';
import { ScheduledMessageResponseDto } from '../../../modules/scheduler/dto/scheduled-message.dto';
import { ScheduledMediaType } from '../../../modules/scheduler/entities/scheduled-message.entity';
import type { SchedulerService } from '../../../modules/scheduler/scheduler.service';
import { defineTool, type AnyToolDescriptor } from '../tool-descriptor';

const sessionId = z.string().min(1).describe('Session UUID (the session id, not the name)');

export function schedulerTools(scheduler: SchedulerService): AnyToolDescriptor[] {
  return [
    defineTool({
      name: 'SchedulerFindAll',
      description: 'List one-shot scheduled messages for a session (soonest first).',
      tier: 'read',
      requiredRole: ApiKeyRole.VIEWER,
      sessionScoped: true,
      inputSchema: z.object({ sessionId }),
      handler: input =>
        scheduler.findAll(input.sessionId).then(jobs => jobs.map(job => ScheduledMessageResponseDto.fromEntity(job))),
    }),
    defineTool({
      name: 'SchedulerFindOne',
      description: 'Get one scheduled message by ID within a session.',
      tier: 'read',
      requiredRole: ApiKeyRole.VIEWER,
      sessionScoped: true,
      inputSchema: z.object({
        sessionId,
        jobId: z.string().min(1).describe('Scheduled message UUID'),
      }),
      handler: input =>
        scheduler.findOne(input.sessionId, input.jobId).then(job => ScheduledMessageResponseDto.fromEntity(job)),
    }),
    defineTool({
      name: 'SchedulerCreate',
      description:
        'Schedule a one-shot text or media-URL send. sendAt must be an ISO-8601 instant with offset. ' +
        'Not a bulk or spam tool — one destination per call. Write tools mount only when MCP_READONLY=false.',
      tier: 'write',
      requiredRole: ApiKeyRole.OPERATOR,
      sessionScoped: true,
      inputSchema: z.object({
        sessionId,
        chatId: z.string().min(1).max(256).describe('Destination chat JID'),
        sendAt: z.string().min(1).describe('ISO-8601 instant with offset (Z or ±HH:MM)'),
        timezone: z.string().min(1).max(64).optional().describe('IANA timezone stored with the job'),
        text: z.string().min(1).max(MESSAGE_TEXT_MAX_LENGTH).optional(),
        mediaUrl: z.string().min(1).max(2048).optional(),
        mediaType: z.enum(['text', 'image', 'video', 'document', 'audio']).optional(),
        caption: z.string().max(1024).optional(),
      }),
      handler: input =>
        scheduler
          .create(input.sessionId, {
            chatId: input.chatId,
            sendAt: input.sendAt,
            timezone: input.timezone,
            text: input.text,
            mediaUrl: input.mediaUrl,
            mediaType: input.mediaType as ScheduledMediaType | undefined,
            caption: input.caption,
          })
          .then(job => ScheduledMessageResponseDto.fromEntity(job)),
    }),
    defineTool({
      name: 'SchedulerCancel',
      description:
        'Cancel a pending scheduled message. Write tools mount only when MCP_READONLY=false. Not bulk.',
      tier: 'write',
      requiredRole: ApiKeyRole.OPERATOR,
      sessionScoped: true,
      inputSchema: z.object({
        sessionId,
        jobId: z.string().min(1).describe('Scheduled message UUID'),
      }),
      handler: async input => {
        await scheduler.cancel(input.sessionId, input.jobId);
        return { cancelled: true };
      },
    }),
  ];
}
