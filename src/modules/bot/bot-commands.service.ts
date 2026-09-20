import { Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { createLogger } from '../../common/services/logger.service';
import { HookManager, type HookContext, type HookResult } from '../../core/hooks';
import { PLUGIN_MESSAGE_PORT, type PluginMessagePort } from '../../core/plugins/plugin-host-ports';
import { BotConfigService } from './bot-config.service';

const PLUGIN_ID = 'openwa-bot-commands';
const startedAt = Date.now();

const MENU = ['ping', 'id', 'uptime', 'menu', 'sticker'];
const ALIASES: Record<string, string> = { s: 'sticker', stiker: 'sticker', help: 'menu' };

@Injectable()
export class BotCommandsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('BotCommandsService');
  private hookId?: string;

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
        if (!/^https?:\/\//i.test(arg)) {
          await messages.sendText(sessionId, { chatId, text: `usage: ${prefix}sticker <https-url>` });
          break;
        }
        await messages.sendSticker(sessionId, { chatId, url: arg });
        break;
      }
      default:
        return false;
    }
    void this.botConfig.maybeAutoRead(sessionId, chatId);
    return true;
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
}
