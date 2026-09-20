import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Optional,
  Param,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConversionStatusResponseDto, ConvertedMediaResponseDto } from './dto/media-response.dto';
import { MediaConversionService } from './media-conversion.service';
import { MediaPersistService } from './media-persist.service';
import { ConvertMediaDto, ConvertStickerDto } from './dto/convert-media.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';

/**
 * Server-side transcoding, scoped to a session.
 *
 * Conversion never touches WhatsApp, so it needs no running engine. The session dimension is kept
 * for two reasons. This project's API keys can be restricted to specific sessions, and the guard
 * resolves that restriction from route parameters: a deployment-global route would have to be marked
 * unscoped, which would shut session-restricted keys out of a feature they need in order to send.
 * And the named session decides which egress proxy a `url` conversion leaves through (#1626), so a
 * proxied session's fetch does not go out from the gateway's own address.
 */
@ApiTags('media')
// Declared on the class because the handlers take the id without an `@ApiParam` of their own. Without
// this the published paths carry a `{sessionId}` template with no parameter to fill it, which OpenAPI
// 3.0 does not allow and a generated client cannot satisfy.
@ApiParam({ name: 'sessionId', type: String, description: 'Session ID the API key must be authorized for' })
@Controller('sessions/:sessionId/media')
export class MediaController {
  constructor(
    private readonly mediaConversion: MediaConversionService,
    @Optional() private readonly mediaPersist?: MediaPersistService,
  ) {}

  @Get('convert')
  @ApiOperation({ summary: 'Whether server-side media conversion is available' })
  @ApiResponse({
    status: 200,
    description:
      'Reports whether conversion is switched on AND the ffmpeg binary can be run, so a client can ' +
      'decide between converting here and converting before it sends.',
    type: ConversionStatusResponseDto,
  })
  async conversionStatus(): Promise<{ available: boolean }> {
    return { available: await this.mediaConversion.isAvailable() };
  }

  // 200, not 201: this creates no resource, it answers with a representation of what was sent.
  @Post('convert/voice')
  @HttpCode(HttpStatus.OK)
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Convert audio into a WhatsApp voice note (Ogg/Opus)' })
  @ApiResponse({
    status: 200,
    description:
      'Converted bytes, ready to post to send-audio with ptt=true. WhatsApp only renders a playable ' +
      'mic bubble for Ogg/Opus; other formats arrive as an audio file that will not play.',
    type: ConvertedMediaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Neither url nor base64 given, or ffmpeg refused the input.' })
  @ApiResponse({ status: 413, description: 'The supplied media is above the media size cap.' })
  @ApiResponse({ status: 429, description: 'The ffmpeg conversion queue is full — retry shortly.' })
  @ApiResponse({
    status: 503,
    description: 'Conversion is disabled, or the ffmpeg binary is not runnable.',
  })
  async convertVoice(@Param('sessionId') sessionId: string, @Body() dto: ConvertMediaDto) {
    return this.mediaConversion.convertToVoice(sessionId, dto);
  }

  @Post('convert/video')
  @HttpCode(HttpStatus.OK)
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Convert video into a WhatsApp-compatible MP4' })
  @ApiResponse({
    status: 200,
    description:
      'Converted bytes: baseline H.264 with AAC audio, long edge bounded at 1280, index moved to the ' +
      'front so the recipient can start playing before the whole file arrives.',
    type: ConvertedMediaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Neither url nor base64 given, or ffmpeg refused the input.' })
  @ApiResponse({ status: 413, description: 'The supplied media is above the media size cap.' })
  @ApiResponse({ status: 429, description: 'The ffmpeg conversion queue is full — retry shortly.' })
  @ApiResponse({
    status: 503,
    description: 'Conversion is disabled, or the ffmpeg binary is not runnable.',
  })
  async convertVideo(@Param('sessionId') sessionId: string, @Body() dto: ConvertMediaDto) {
    return this.mediaConversion.convertToVideo(sessionId, dto);
  }

  @Post('convert/sticker')
  @HttpCode(HttpStatus.OK)
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Convert image or video into a WhatsApp WebP sticker' })
  @ApiResponse({
    status: 200,
    description: 'Converted 512×512 WebP sticker bytes, ready to post to send-sticker.',
    type: ConvertedMediaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad input, ffmpeg refused, or REMOVE_BG_API_KEY missing when removeBg=true.',
  })
  @ApiResponse({ status: 413, description: 'The supplied media is above the media size cap.' })
  @ApiResponse({ status: 429, description: 'The ffmpeg conversion queue is full — retry shortly.' })
  @ApiResponse({
    status: 503,
    description: 'Conversion is disabled, or the ffmpeg binary is not runnable.',
  })
  async convertSticker(@Param('sessionId') sessionId: string, @Body() dto: ConvertStickerDto) {
    return this.mediaConversion.convertToSticker(sessionId, dto);
  }

  @Get('files')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'List inbound files stored when MEDIA_PERSIST is on' })
  @ApiResponse({ status: 200, description: 'Stored files for this session (empty when none).' })
  @ApiResponse({ status: 404, description: 'MEDIA_PERSIST is off, or the session has no stored files index.' })
  async listStoredFiles(@Param('sessionId') sessionId: string) {
    return this.persist().list(sessionId);
  }

  @Get('files/:messageId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Fetch stored inbound media bytes for a message' })
  @ApiResponse({
    status: 200,
    description: 'The stored bytes as an attachment.',
    content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 404, description: 'MEDIA_PERSIST is off, or no stored file for this message.' })
  async getStoredFile(
    @Param('sessionId') sessionId: string,
    @Param('messageId') messageId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.persist().get(sessionId, messageId);
    res.set({
      'Content-Type': 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'attachment',
    });
    return new StreamableFile(buffer);
  }

  @Delete('files/:messageId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stored inbound media file' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'MEDIA_PERSIST is off, or no stored file for this message.' })
  async deleteStoredFile(@Param('sessionId') sessionId: string, @Param('messageId') messageId: string): Promise<void> {
    await this.persist().remove(sessionId, messageId);
  }

  private persist(): MediaPersistService {
    if (!this.mediaPersist) throw new NotFoundException();
    return this.mediaPersist;
  }
}
