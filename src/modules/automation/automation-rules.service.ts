import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '../../common/services/logger.service';
import { LidMappingStoreService } from '../../engine/identity/lid-mapping-store.service';
import { evaluateFilters } from '../webhook/filters/filter-evaluator';
import {
  BOT_INBOUND_PORT,
  PLUGIN_MESSAGE_PORT,
  type BotInboundPort,
  type PluginMessagePort,
} from '../../core/plugins/plugin-host-ports';
import { AutomationChatContext, AutomationMatchMode } from './automation-match';
import { AutomationRule } from './entities/automation-rule.entity';
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation-rule.dto';

/** Entries above this size trigger a sweep of expired cooldowns before inserting the next one. */
const COOLDOWN_SWEEP_THRESHOLD = 10_000;

const MAX_MESSAGE_AGE_SECONDS = 300;

@Injectable()
export class AutomationRulesService {
  private readonly logger = createLogger('AutomationRulesService');

  /** `${ruleId}:${chatId}` -> epoch ms until which the rule stays quiet in that chat. Per-process. */
  private readonly cooldowns = new Map<string, number>();
  private readonly ruleCache = new Map<string, AutomationRule[]>();
  private readonly regexCache = new Map<string, RegExp | null>();

  private messagePort?: PluginMessagePort;

  constructor(
    @InjectRepository(AutomationRule, 'data')
    private readonly ruleRepository: Repository<AutomationRule>,
    @Optional()
    private readonly moduleRef?: ModuleRef,
    @Optional()
    private readonly lidMappingStore?: LidMappingStoreService,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  async create(sessionId: string, dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    const maxPerSession = this.configService?.get<number>('automation.maxPerSession', 32) ?? 32;
    if (maxPerSession > 0) {
      const existing = await this.ruleRepository.count({ where: { sessionId } });
      if (existing >= maxPerSession) {
        throw new BadRequestException(
          `Automation rule limit reached for this session (${existing}/${maxPerSession}); delete one before adding another`,
        );
      }
    }
    const match = this.normalizeMatch(dto.matchMode, dto.matchPattern);
    const rule = this.ruleRepository.create({
      sessionId,
      name: dto.name,
      replyText: dto.replyText,
      conditions: dto.conditions ?? null,
      cooldownSeconds: dto.cooldownSeconds ?? 60,
      enabled: dto.enabled ?? true,
      matchMode: match.matchMode,
      matchPattern: match.matchPattern,
      chatContext: dto.chatContext ?? AutomationChatContext.ALL,
      replyMediaUrl: dto.replyMediaUrl ?? null,
    });
    const saved = await this.ruleRepository.save(rule);
    this.invalidate(sessionId);
    return saved;
  }

  async findAll(sessionId: string): Promise<AutomationRule[]> {
    return this.ruleRepository.find({ where: { sessionId }, order: { createdAt: 'ASC', id: 'ASC' } });
  }

  async findOne(sessionId: string, id: string): Promise<AutomationRule> {
    const rule = await this.ruleRepository.findOne({ where: { id, sessionId } });
    if (!rule) {
      throw new NotFoundException(`Automation rule ${id} not found`);
    }
    return rule;
  }

  async update(sessionId: string, id: string, dto: UpdateAutomationRuleDto): Promise<AutomationRule> {
    const rule = await this.findOne(sessionId, id);
    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.replyText !== undefined) rule.replyText = dto.replyText;
    if (dto.conditions !== undefined) rule.conditions = dto.conditions;
    if (dto.cooldownSeconds !== undefined) rule.cooldownSeconds = dto.cooldownSeconds;
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    if (dto.chatContext !== undefined) rule.chatContext = dto.chatContext;
    if (dto.replyMediaUrl !== undefined) rule.replyMediaUrl = dto.replyMediaUrl;
    if (dto.matchMode !== undefined || dto.matchPattern !== undefined) {
      const match = this.normalizeMatch(
        dto.matchMode ?? rule.matchMode,
        dto.matchPattern !== undefined ? dto.matchPattern : rule.matchPattern,
      );
      rule.matchMode = match.matchMode;
      rule.matchPattern = match.matchPattern;
    }
    const saved = await this.ruleRepository.save(rule);
    this.invalidate(sessionId);
    return saved;
  }

  async remove(sessionId: string, id: string): Promise<void> {
    const rule = await this.findOne(sessionId, id);
    await this.ruleRepository.remove(rule);
    this.invalidate(sessionId);
  }

  /**
   * Evaluate one inbound message against the session's rules; first match replies.
   * Access lists (bot-config) run BEFORE rule conditions. Commands that already handled the
   * message skip the matcher. fromMe is skipped.
   */
  async evaluateInbound(sessionId: string, message: Record<string, unknown>): Promise<void> {
    if (message.fromMe === true) return;
    if (message._openwaCommandHandled === true) return;
    const chatId = typeof message.chatId === 'string' ? message.chatId : null;
    if (!chatId) return;
    const timestamp = typeof message.timestamp === 'number' ? message.timestamp : null;
    if (timestamp !== null && Date.now() / 1000 - timestamp > MAX_MESSAGE_AGE_SECONDS) return;

    const isGroup = message.isGroup === true;
    const sender =
      typeof message.author === 'string' ? message.author : typeof message.from === 'string' ? message.from : chatId;
    const bot = this.resolveBotPort();
    if (bot) {
      try {
        if (!(await bot.senderAllowed(sessionId, sender, isGroup))) return;
        void bot.maybeAutoRead(sessionId, chatId);
      } catch (error) {
        this.logger.debug('Bot access check skipped', {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    let rules: AutomationRule[];
    try {
      rules = await this.enabledRules(sessionId);
    } catch (error) {
      this.logger.warn('Automation rule lookup failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    if (rules.length === 0) return;

    const resolveLid = (jid: string): string | null => this.lidMappingStore?.resolveLid(jid) ?? null;
    const body = typeof message.body === 'string' ? message.body : '';

    const rule = rules.find(
      candidate =>
        this.matchesChatContext(candidate, isGroup) &&
        evaluateFilters(candidate.conditions, 'message.received', message, resolveLid) &&
        this.matchesPattern(candidate, body),
    );
    if (!rule) return;
    if (this.inCooldown(rule, chatId)) return;
    this.enterCooldown(rule, chatId);

    try {
      const messagePort = this.resolveMessagePort();
      if (!messagePort) return;
      if (rule.replyMediaUrl) {
        await messagePort.sendImage(sessionId, {
          chatId,
          url: rule.replyMediaUrl,
          caption: rule.replyText,
        });
      } else {
        await messagePort.sendText(sessionId, { chatId, text: rule.replyText });
      }
      this.logger.log('Automation rule replied', { sessionId, ruleId: rule.id, chatId });
    } catch (error) {
      this.logger.warn('Automation rule reply failed', {
        sessionId,
        ruleId: rule.id,
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async enabledRules(sessionId: string): Promise<AutomationRule[]> {
    const cached = this.ruleCache.get(sessionId);
    if (cached) return cached.filter(r => r.enabled);
    const all = await this.ruleRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    this.ruleCache.set(sessionId, all);
    return all.filter(r => r.enabled);
  }

  private invalidate(sessionId: string): void {
    this.ruleCache.delete(sessionId);
    for (const key of [...this.regexCache.keys()]) {
      if (key.startsWith(`${sessionId}:`)) this.regexCache.delete(key);
    }
  }

  private normalizeMatch(
    matchMode: AutomationMatchMode | undefined,
    matchPattern: string | null | undefined,
  ): { matchMode: AutomationMatchMode; matchPattern: string | null } {
    const mode = matchMode ?? AutomationMatchMode.CONTAINS;
    const pattern = matchPattern?.trim() ? matchPattern : null;
    if (mode === AutomationMatchMode.REGEX) {
      if (this.configService?.get<boolean>('features.autoReplyRegex') !== true) {
        throw new BadRequestException('Regex matchMode requires AUTO_REPLY_REGEX=true');
      }
      const cap = this.configService?.get<number>('automation.regexMaxPatternLength', 256) ?? 256;
      if (pattern && pattern.length > cap) {
        throw new BadRequestException(`Regex pattern exceeds ${cap} characters`);
      }
      if (pattern) {
        try {
          new RegExp(pattern);
        } catch {
          throw new BadRequestException('Invalid regex pattern');
        }
      }
    }
    return { matchMode: mode, matchPattern: pattern };
  }

  private matchesChatContext(rule: AutomationRule, isGroup: boolean): boolean {
    const ctx = rule.chatContext ?? AutomationChatContext.ALL;
    if (ctx === AutomationChatContext.GROUP) return isGroup;
    if (ctx === AutomationChatContext.PRIVATE) return !isGroup;
    return true;
  }

  private matchesPattern(rule: AutomationRule, body: string): boolean {
    const pattern = rule.matchPattern;
    if (!pattern) return true;
    const mode = rule.matchMode ?? AutomationMatchMode.CONTAINS;
    if (mode === AutomationMatchMode.EQUALS) return body === pattern;
    if (mode === AutomationMatchMode.STARTS_WITH) return body.startsWith(pattern);
    if (mode === AutomationMatchMode.CONTAINS) return body.includes(pattern);
    if (mode === AutomationMatchMode.REGEX) {
      if (this.configService?.get<boolean>('features.autoReplyRegex') !== true) return false;
      const cap = this.configService?.get<number>('automation.regexMaxPatternLength', 256) ?? 256;
      const input = body.length > cap ? body.slice(0, cap) : body;
      const re = this.compileRegex(rule, pattern, cap);
      if (!re) return false;
      return re.test(input);
    }
    return true;
  }

  private compileRegex(rule: AutomationRule, pattern: string, cap: number): RegExp | null {
    if (pattern.length > cap) return null;
    const key = `${rule.sessionId}:${rule.id}:${pattern}`;
    if (this.regexCache.has(key)) return this.regexCache.get(key) ?? null;
    try {
      const re = new RegExp(pattern);
      this.regexCache.set(key, re);
      return re;
    } catch {
      this.regexCache.set(key, null);
      return null;
    }
  }

  private resolveBotPort(): BotInboundPort | undefined {
    try {
      return this.moduleRef?.get<typeof BOT_INBOUND_PORT, BotInboundPort>(BOT_INBOUND_PORT, { strict: false });
    } catch {
      return undefined;
    }
  }

  private resolveMessagePort(): PluginMessagePort | undefined {
    if (!this.messagePort) {
      try {
        this.messagePort = this.moduleRef?.get<typeof PLUGIN_MESSAGE_PORT, PluginMessagePort>(PLUGIN_MESSAGE_PORT, {
          strict: false,
        });
      } catch (error) {
        this.logger.warn('MessageService is not resolvable; automation replies are disabled', {
          error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
      }
    }
    return this.messagePort;
  }

  private inCooldown(rule: AutomationRule, chatId: string): boolean {
    if (!rule.cooldownSeconds) return false;
    const until = this.cooldowns.get(`${rule.id}:${chatId}`);
    return until !== undefined && until > Date.now();
  }

  private enterCooldown(rule: AutomationRule, chatId: string): void {
    if (!rule.cooldownSeconds) return;
    if (this.cooldowns.size >= COOLDOWN_SWEEP_THRESHOLD) {
      const now = Date.now();
      for (const [key, until] of this.cooldowns) {
        if (until <= now) this.cooldowns.delete(key);
      }
    }
    this.cooldowns.set(`${rule.id}:${chatId}`, Date.now() + rule.cooldownSeconds * 1000);
  }
}
