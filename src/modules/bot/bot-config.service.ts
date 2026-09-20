import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '../../common/services/logger.service';
import {
  BOT_INBOUND_PORT,
  PLUGIN_MESSAGE_PORT,
  PLUGIN_SESSION_PORT,
  type BotInboundPort,
  type PluginMessagePort,
  type PluginSessionPort,
} from '../../core/plugins/plugin-host-ports';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { BotAccessMode, senderIsAllowed } from './bot-access';
import { UpdateBotConfigDto } from './dto/bot-config.dto';
import { BotConfig } from './entities/bot-config.entity';

const DEFAULTS: Pick<
  BotConfig,
  | 'accessMode'
  | 'allowList'
  | 'blockList'
  | 'prefix'
  | 'commandsEnabled'
  | 'autoRead'
  | 'alwaysOnline'
  | 'welcomeMessage'
  | 'stickerPackName'
  | 'stickerPackAuthor'
> = {
  accessMode: BotAccessMode.ALL,
  allowList: [],
  blockList: [],
  prefix: '#',
  commandsEnabled: true,
  autoRead: false,
  alwaysOnline: false,
  welcomeMessage: null,
  stickerPackName: null,
  stickerPackAuthor: null,
};

@Injectable()
export class BotConfigService implements BotInboundPort {
  private readonly logger = createLogger('BotConfigService');
  private readonly cache = new Map<string, BotConfig | null>();

  constructor(
    @InjectRepository(BotConfig, 'data')
    private readonly repo: Repository<BotConfig>,
    @Optional()
    private readonly moduleRef?: ModuleRef,
    @Optional()
    private readonly audit?: AuditService,
  ) {}

  async get(sessionId: string): Promise<BotConfig> {
    const cached = this.cache.get(sessionId);
    if (cached !== undefined) {
      return cached ?? this.virtual(sessionId);
    }
    const row = await this.repo.findOne({ where: { sessionId } });
    this.cache.set(sessionId, row);
    return row ?? this.virtual(sessionId);
  }

  async requireExisting(sessionId: string): Promise<BotConfig> {
    const row = await this.repo.findOne({ where: { sessionId } });
    if (!row) throw new NotFoundException(`Bot config for session ${sessionId} not found`);
    return row;
  }

  async upsert(sessionId: string, dto: UpdateBotConfigDto): Promise<BotConfig> {
    let row = await this.repo.findOne({ where: { sessionId } });
    if (!row) {
      row = this.repo.create({ sessionId, ...DEFAULTS });
    }
    if (dto.accessMode !== undefined) row.accessMode = dto.accessMode;
    if (dto.allowList !== undefined) row.allowList = dto.allowList;
    if (dto.blockList !== undefined) row.blockList = dto.blockList;
    if (dto.prefix !== undefined) row.prefix = dto.prefix || '#';
    if (dto.commandsEnabled !== undefined) row.commandsEnabled = dto.commandsEnabled;
    if (dto.autoRead !== undefined) row.autoRead = dto.autoRead;
    if (dto.alwaysOnline !== undefined) row.alwaysOnline = dto.alwaysOnline;
    if (dto.welcomeMessage !== undefined) {
      row.welcomeMessage = dto.welcomeMessage === '' ? null : dto.welcomeMessage;
    }
    if (dto.stickerPackName !== undefined) {
      row.stickerPackName = dto.stickerPackName === '' ? null : dto.stickerPackName;
    }
    if (dto.stickerPackAuthor !== undefined) {
      row.stickerPackAuthor = dto.stickerPackAuthor === '' ? null : dto.stickerPackAuthor;
    }
    const saved = await this.repo.save(row);
    this.cache.set(sessionId, saved);
    void this.audit
      ?.logInfo(AuditAction.BOT_CONFIG_UPDATED, { sessionId, metadata: { accessMode: saved.accessMode } })
      .catch(() => undefined);
    if (saved.alwaysOnline) {
      void this.applyAlwaysOnline(sessionId);
    }
    return saved;
  }

  async senderAllowed(sessionId: string, sender: string | null | undefined, isGroup: boolean): Promise<boolean> {
    void isGroup;
    const cfg = await this.get(sessionId);
    return senderIsAllowed(cfg.accessMode, cfg.allowList, cfg.blockList, sender);
  }

  async looksLikeCommand(sessionId: string, body: string | null | undefined): Promise<boolean> {
    if (!body) return false;
    const cfg = await this.get(sessionId);
    if (!cfg.commandsEnabled) return false;
    const prefix = cfg.prefix || '#';
    return body.trimStart().startsWith(prefix);
  }

  async maybeAutoRead(sessionId: string, chatId: string): Promise<void> {
    const cfg = await this.get(sessionId);
    if (!cfg.autoRead) return;
    try {
      const sessionPort = this.sessionPort();
      const engine = sessionPort?.getEngine(sessionId);
      if (!engine) return;
      await engine.sendSeen(chatId);
    } catch (error) {
      this.logger.debug('autoRead skipped', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async handleGroupJoin(sessionId: string, groupId: string): Promise<void> {
    const cfg = await this.get(sessionId);
    const text = cfg.welcomeMessage?.trim();
    if (!text) return;
    if (!senderIsAllowed(cfg.accessMode, cfg.allowList, cfg.blockList, groupId)) return;
    try {
      const messages = this.messagePort();
      if (!messages) return;
      await messages.sendText(sessionId, { chatId: groupId, text });
    } catch (error) {
      this.logger.warn('Welcome message failed', {
        sessionId,
        groupId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private virtual(sessionId: string): BotConfig {
    return { id: '', sessionId, ...DEFAULTS, createdAt: new Date(0), updatedAt: new Date(0) } as unknown as BotConfig;
  }

  private async applyAlwaysOnline(sessionId: string): Promise<void> {
    try {
      const engine = this.sessionPort()?.getEngine(sessionId);
      if (!engine) return;
      await engine.setOnlinePresence(true);
    } catch (error) {
      this.logger.debug('alwaysOnline skipped', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private messagePort(): PluginMessagePort | undefined {
    try {
      return this.moduleRef?.get<typeof PLUGIN_MESSAGE_PORT, PluginMessagePort>(PLUGIN_MESSAGE_PORT, {
        strict: false,
      });
    } catch {
      return undefined;
    }
  }

  private sessionPort(): PluginSessionPort | undefined {
    try {
      return this.moduleRef?.get<typeof PLUGIN_SESSION_PORT, PluginSessionPort>(PLUGIN_SESSION_PORT, {
        strict: false,
      });
    } catch {
      return undefined;
    }
  }
}

/** Token alias kept next to the service so AppModule does not import the class for the port. */
export const botInboundPortProvider = { provide: BOT_INBOUND_PORT, useExisting: BotConfigService };
