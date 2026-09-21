import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { createLogger } from '../../common/services/logger.service';
import { HookManager, type HookContext, type HookResult } from '../../core/hooks';
import { PLUGIN_MESSAGE_PORT, type PluginMessagePort } from '../../core/plugins/plugin-host-ports';
import { MediaConversionService } from '../media/media-conversion.service';
import { MessageService } from '../message/message.service';
import { BotConfigService } from './bot-config.service';

const PLUGIN_ID = 'openwa-bot-commands';
const startedAt = Date.now();

const MENU = ['ping', 'id', 'uptime', 'menu', 'sticker'];
const ALIASES: Record<string, string> = { s: 'sticker', stiker: 'sticker', help: 'menu' };
const IMAGE_OR_VIDEO = new Set(['image', 'video']);

@Injectable()
export class BotCommandsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('BotCommandsService');
  private hookId?: string;
  private readonly lastBySender = new Map<string, number>();

  constructor(
    private readonly botConfig: BotConfigService,
    private readonly hookManager: HookManager,
    @Optional()
    private readonly config?: ConfigService,
    @Optional()
    private readonly moduleRef?: ModuleRef,
  ) {}

  onModuleInit(): void {
    if (this.config?.get<boolean>('features.botCommands') !== true) {
      this.logger.log('Bot commands idle (BOT_COMMANDS=false)');
      return;
    }
    this.hookId = this.hookManager.register(
      PLUGIN_ID,
      'message:received',
      ctx => this.onMessage(ctx as HookContext<Record<string, unknown>>),
      40,
    );
  }

  onModuleDestroy(): void {
    if (this.hookId) this.hookManager.unregister(this.hookId);
  }

  async onMessage(ctx: HookContext<Record<string, unknown>>): Promise<HookResult<Record<string, unknown>>> {
    const data = ctx.data ?? {};
    const sessionId = ctx.sessionId;
    if (!sessionId || data.fromMe === true) return { continue: true, data };
    try {
      const handled = await this.handleInbound(sessionId, data);
      if (handled) {
        data._openwaCommandHandled = true;
      }
    } catch (error) {
      this.logger.warn('Command handler failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return { continue: true, data };
  }

  async handleInbound(sessionId: string, message: Record<string, unknown>): Promise<boolean> {
    if (message.fromMe === true) return false;
    const chatId = typeof message.chatId === 'string' ? message.chatId : null;
    const body = typeof message.body === 'string' ? message.body : '';
    if (!chatId || !body) return false;
    const isGroup = message.isGroup === true;
    const sender =
      typeof message.author === 'string' ? message.author : typeof message.from === 'string' ? message.from : chatId;
    if (!(await this.botConfig.senderAllowed(sessionId, sender, isGroup))) return false;

    const cfg = await this.botConfig.get(sessionId);
    if (!cfg.commandsEnabled) return false;
    const prefix = cfg.prefix || '#';
    const trimmed = body.trim();
    if (!trimmed.startsWith(prefix)) return false;
    const rest = trimmed.slice(prefix.length).trim();
    const space = rest.search(/\s/);
    const raw = (space === -1 ? rest : rest.slice(0, space)).toLowerCase();
    const name = ALIASES[raw] ?? raw;
    const arg = space === -1 ? '' : rest.slice(space).trim();
    if (!MENU.includes(name)) return false;

    const messages = this.messagePort();
    if (!messages) return false;

    if (this.cooldownHit(sessionId, sender)) return true;

    try {
      switch (name) {
        case 'ping':
          await messages.sendText(sessionId, { chatId, text: 'pong' });
          break;
        case 'id':
          await messages.sendText(sessionId, { chatId, text: `chatId=${chatId}\nsessionId=${sessionId}` });
          break;
        case 'uptime':
          await messages.sendText(sessionId, {
            chatId,
            text: `uptime ${Math.floor((Date.now() - startedAt) / 1000)}s`,
          });
          break;
        case 'menu':
          await messages.sendText(sessionId, {
            chatId,
            text: MENU.map(cmd => `${prefix}${cmd}`).join('\n'),
          });
          break;
        case 'sticker': {
          await this.handleSticker(sessionId, chatId, arg, prefix, message, cfg, messages);
          break;
        }
        default:
          return false;
      }
    } catch (error) {
      this.logger.warn('Command reply failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        await messages.sendText(sessionId, { chatId, text: 'command failed' });
      } catch {
        /* still never throw out of the hook */
      }
    }
    void this.botConfig.maybeAutoRead(sessionId, chatId);
    return true;
  }

  private async handleSticker(
    sessionId: string,
    chatId: string,
    arg: string,
    prefix: string,
    message: Record<string, unknown>,
    cfg: { stickerPackName?: string | null; stickerPackAuthor?: string | null },
    messages: PluginMessagePort,
  ): Promise<void> {
    if (/^https?:\/\//i.test(arg)) {
      await messages.sendSticker(sessionId, { chatId, url: arg });
      return;
    }

    const usage = `usage: ${prefix}sticker <https-url> (or caption / reply on an image or video)`;
    const inbound = this.inboundMediaBytes(message);
    let base64 = inbound?.base64 ?? null;

    if (!base64) {
      const quoted = this.quotedMediaRef(message);
      if (quoted) {
        const svc = this.messageService();
        if (!svc) {
          await messages.sendText(sessionId, { chatId, text: 'sticker conversion is not available' });
          return;
        }
        try {
          const got = await svc.getChatMedia(sessionId, chatId, quoted);
          base64 = got.buffer.toString('base64');
        } catch {
          await messages.sendText(sessionId, { chatId, text: 'quoted media not available' });
          return;
        }
      }
    }

    if (!base64) {
      await messages.sendText(sessionId, { chatId, text: usage });
      return;
    }

    const conversion = this.conversionService();
    const sender = this.messageService();
    if (!conversion || !sender) {
      await messages.sendText(sessionId, { chatId, text: 'sticker conversion is not available' });
      return;
    }
    try {
      const converted = await conversion.convertToSticker(sessionId, {
        base64,
        packName: cfg.stickerPackName ?? undefined,
        author: cfg.stickerPackAuthor ?? undefined,
        removeBg: false,
      });
      await sender.sendSticker(sessionId, {
        chatId,
        base64: converted.base64,
        mimetype: converted.mimetype,
        packName: cfg.stickerPackName ?? undefined,
        author: cfg.stickerPackAuthor ?? undefined,
      });
    } catch (error) {
      const busy = error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS;
      const text = busy
        ? 'busy, try again'
        : error instanceof Error && error.message
          ? error.message.slice(0, 180)
          : 'sticker conversion failed';
      await messages.sendText(sessionId, { chatId, text });
    }
  }

  private inboundMediaBytes(message: Record<string, unknown>): { base64: string } | null {
    const type = typeof message.type === 'string' ? message.type : '';
    if (!IMAGE_OR_VIDEO.has(type)) return null;
    const media = message.media as { data?: unknown; omitted?: unknown } | undefined;
    if (!media || media.omitted === true || typeof media.data !== 'string' || !media.data) return null;
    if (/^https?:\/\//i.test(media.data)) return null;
    return { base64: media.data };
  }

  private quotedMediaRef(message: Record<string, unknown>): string | null {
    const quoted = message.quotedMessage as { id?: unknown; type?: unknown; hasMedia?: unknown } | undefined;
    if (!quoted || typeof quoted.id !== 'string' || !quoted.id) return null;
    const type = typeof quoted.type === 'string' ? quoted.type : '';
    if (IMAGE_OR_VIDEO.has(type) || quoted.hasMedia === true) return quoted.id;
    return null;
  }

  private cooldownHit(sessionId: string, sender: string): boolean {
    const raw = this.config?.get<number>('bot.commandCooldownMs');
    const ms = typeof raw === 'number' && Number.isFinite(raw) ? raw : 3000;
    if (ms <= 0) return false;
    const key = `${sessionId}:${sender}`;
    const last = this.lastBySender.get(key) ?? 0;
    const now = Date.now();
    if (now - last < ms) return true;
    this.lastBySender.set(key, now);
    if (this.lastBySender.size > 5000) {
      const cutoff = now - ms * 4;
      for (const [k, at] of this.lastBySender) {
        if (at < cutoff) this.lastBySender.delete(k);
      }
    }
    return false;
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

  private messageService(): MessageService | undefined {
    try {
      return this.moduleRef?.get(MessageService, { strict: false });
    } catch {
      return undefined;
    }
  }

  private conversionService(): MediaConversionService | undefined {
    try {
      return this.moduleRef?.get(MediaConversionService, { strict: false });
    } catch {
      return undefined;
    }
  }
}
