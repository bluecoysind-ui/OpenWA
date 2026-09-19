import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { ApiKeyRole } from '../auth/entities/api-key.entity';
import {
  CreateScheduledMessageDto,
  ScheduledMessageResponseDto,
  UpdateScheduledMessageDto,
} from './dto/scheduled-message.dto';
import { SchedulerService } from './scheduler.service';

@ApiTags('scheduler')
@Controller('sessions/:sessionId/scheduled-messages')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  @Post()
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Schedule a one-shot text or media-URL send' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'Job created.', type: ScheduledMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid body, flag off, cap, or horizon.' })
  async create(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateScheduledMessageDto,
  ): Promise<ScheduledMessageResponseDto> {
    return ScheduledMessageResponseDto.fromEntity(await this.scheduler.create(sessionId, dto));
  }

  @Get()
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'List scheduled messages for the session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, type: ScheduledMessageResponseDto, isArray: true })
  async findAll(@Param('sessionId') sessionId: string): Promise<ScheduledMessageResponseDto[]> {
    return (await this.scheduler.findAll(sessionId)).map(job => ScheduledMessageResponseDto.fromEntity(job));
  }

  @Get(':jobId')
  @RequireRole(ApiKeyRole.VIEWER)
  @ApiOperation({ summary: 'Get one scheduled message' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, type: ScheduledMessageResponseDto })
  @ApiResponse({ status: 404, description: 'No such job in this session.' })
  async findOne(
    @Param('sessionId') sessionId: string,
    @Param('jobId') jobId: string,
  ): Promise<ScheduledMessageResponseDto> {
    return ScheduledMessageResponseDto.fromEntity(await this.scheduler.findOne(sessionId, jobId));
  }

  @Patch(':jobId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @ApiOperation({ summary: 'Update a pending scheduled message' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, type: ScheduledMessageResponseDto })
  @ApiResponse({ status: 409, description: 'Job is not pending.' })
  async update(
    @Param('sessionId') sessionId: string,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateScheduledMessageDto,
  ): Promise<ScheduledMessageResponseDto> {
    return ScheduledMessageResponseDto.fromEntity(await this.scheduler.update(sessionId, jobId, dto));
  }

  @Delete(':jobId')
  @RequireRole(ApiKeyRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending scheduled message' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 204, description: 'Job cancelled.' })
  @ApiResponse({ status: 409, description: 'Job is not pending.' })
  async remove(@Param('sessionId') sessionId: string, @Param('jobId') jobId: string): Promise<void> {
    await this.scheduler.cancel(sessionId, jobId);
  }
}
