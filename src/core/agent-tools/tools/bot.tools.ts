import { z } from 'zod';
import { ApiKeyRole } from '../../../modules/auth/entities/api-key.entity';
import { BotConfigResponseDto } from '../../../modules/bot/dto/bot-config.dto';
import type { BotConfigService } from '../../../modules/bot/bot-config.service';
import { defineTool, type AnyToolDescriptor } from '../tool-descriptor';

const sessionId = z.string().min(1).describe('Session UUID (the session id, not the name)');

export function botTools(botConfig: BotConfigService): AnyToolDescriptor[] {
  return [
    defineTool({
      name: 'BotConfigGet',
      description:
        'Get the session bot config (access lists, prefix, commands, autoRead, alwaysOnline, welcome). ' +
        'Defaults if never saved. Does not return secrets.',
      tier: 'read',
      requiredRole: ApiKeyRole.VIEWER,
      sessionScoped: true,
      inputSchema: z.object({ sessionId }),
      handler: input => botConfig.get(input.sessionId).then(row => BotConfigResponseDto.fromEntity(row)),
    }),
  ];
}
