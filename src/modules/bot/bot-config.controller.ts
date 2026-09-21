import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import { BotConfigService } from './bot-config.service';
import { BotConfigResponseDto, UpdateBotConfigDto } from './dto/bot-config.dto';

@ApiTags('bot')
@Controller('sessions/:sessionId/bot-config')
export class BotConfigController {
  constructor(private readonly botConfig: BotConfigService) {}

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get the session bot config (defaults if never saved)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: BotConfigResponseDto })
  async get(@Param('sessionId') sessionId: string): Promise<BotConfigResponseDto> {
    return BotConfigResponseDto.fromEntity(await this.botConfig.get(sessionId));
  }

  @Put()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Create or replace the session bot config' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: BotConfigResponseDto })
  async put(@Param('sessionId') sessionId: string, @Body() dto: UpdateBotConfigDto): Promise<BotConfigResponseDto> {
    return BotConfigResponseDto.fromEntity(await this.botConfig.upsert(sessionId, dto));
  }
}
