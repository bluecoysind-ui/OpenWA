import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HookManager, type HookContext } from '../../core/hooks';
import { isTerminalUnlinkReason } from '../session/session-terminal-unlink-reasons';
import { Session } from '../session/entities/session.entity';
import { BluecoysCallbackService } from './bluecoys-callback.service';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';
import { BLUECOYS_CONFIG_PHONE, BLUECOYS_CONFIG_USERNAME } from './bluecoys.types';
import { digitsOnlyPhone } from './bluecoys-phone';
import { phonesMatch, readBluecoysConfig } from './bluecoys-session.util';

type ReadyHookData = { phone?: string; pushName?: string };
type DisconnectedHookData = { reason?: string };

@Injectable()
export class BluecoysHooksService implements OnModuleInit, OnModuleDestroy {
  private readyHookId?: string;
  private disconnectedHookId?: string;
  private qrHookId?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly hookManager: HookManager,
    private readonly callbacks: BluecoysCallbackService,
    private readonly qrState: BluecoysQrStateService,
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
  ) {}

  onModuleInit(): void {
    if (this.config.get<boolean>('bluecoys.enabled') !== true) return;

    this.qrHookId = this.hookManager.register('bluecoys', 'session:qr', ctx => this.onQr(ctx));
    this.readyHookId = this.hookManager.register('bluecoys', 'session:ready', ctx => this.onReady(ctx));
    this.disconnectedHookId = this.hookManager.register('bluecoys', 'session:disconnected', ctx =>
      this.onDisconnected(ctx),
    );
  }

  onModuleDestroy(): void {
    if (this.qrHookId) this.hookManager.unregister(this.qrHookId);
    if (this.readyHookId) this.hookManager.unregister(this.readyHookId);
    if (this.disconnectedHookId) this.hookManager.unregister(this.disconnectedHookId);
  }

  private async onQr(ctx: HookContext): Promise<{ continue: boolean; data: unknown }> {
    const sessionId = ctx.sessionId;
    if (!sessionId) return { continue: true, data: ctx.data };
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!readBluecoysConfig(session?.config)) return { continue: true, data: ctx.data };
    this.qrState.markQrIssued(sessionId);
    return { continue: true, data: ctx.data };
  }

  private async onReady(ctx: HookContext): Promise<{ continue: boolean; data: unknown }> {
    const sessionId = ctx.sessionId;
    if (!sessionId) return { continue: true, data: ctx.data };

    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    const meta = readBluecoysConfig(session?.config);
    if (!meta) return { continue: true, data: ctx.data };

    const data = ctx.data as ReadyHookData;
    const phone = data.phone ?? session?.phone ?? '';
    if (!phone) return { continue: true, data: ctx.data };

    if (!phonesMatch(meta[BLUECOYS_CONFIG_PHONE], phone)) {
      return { continue: true, data: ctx.data };
    }

    this.qrState.clear(sessionId);
    await this.callbacks.notifyLinked(phone, meta[BLUECOYS_CONFIG_USERNAME]);
    return { continue: true, data: ctx.data };
  }

  private async onDisconnected(ctx: HookContext): Promise<{ continue: boolean; data: unknown }> {
    const sessionId = ctx.sessionId;
    if (!sessionId) return { continue: true, data: ctx.data };

    const data = ctx.data as DisconnectedHookData;
    const reason = data.reason ?? '';
    if (!isTerminalUnlinkReason(reason)) {
      return { continue: true, data: ctx.data };
    }

    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    const meta = readBluecoysConfig(session?.config);
    if (!meta) return { continue: true, data: ctx.data };

    const phone = session?.phone;
    if (!phone) return { continue: true, data: ctx.data };

    this.qrState.clear(sessionId);
    await this.callbacks.notifyDisconnected(phone);
    return { continue: true, data: ctx.data };
  }
}
