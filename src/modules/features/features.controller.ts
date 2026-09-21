import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { FeaturesResponseDto } from './dto/features-response.dto';

@ApiTags('features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({
    summary: 'Boolean feature flags for UI gating',
    description:
      'Deployment-wide booleans only. Scoped keys may read them (same values for every session). ' +
      'Never returns secrets, env dumps, or configuration objects.',
  })
  @ApiResponse({ status: 200, description: 'Boolean flags only.', type: FeaturesResponseDto })
  get(): FeaturesResponseDto {
    const flags = resolveFeatureFlags(this.config);
    const removeBgKey = this.config.get<string>('removeBg.apiKey', '') ?? '';
    return {
      scheduler: flags.scheduledMessages,
      botCommands: flags.botCommands,
      mediaPersist: flags.mediaPersist,
      removeBgConfigured: removeBgKey.trim().length > 0,
      regexRules: flags.autoReplyRegex,
      pollVoteEvents: flags.pollVoteEvents,
    };
  }
}
