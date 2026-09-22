import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HookManager, type HookContext } from '../../core/hooks';
import { isTerminalUnlinkReason } from '../session/session-terminal-unlink-reasons';
import { Session } from '../session/entities/session.entity';
import { BluecoysCallbackService } from './bluecoys-callback.service';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';
import { BLUECOYS_CONFIG_PHONE, BLUECOYS_CONFIG_USERNAME } from './bluecoys.types';
import { phonesMatch, readBluecoysConfig } from './bluecoys-session.util';

type ReadyHookData = { phone?: string; pushName?: string };
type DisconnectedHookData = { reason?: string };

/**
 * Bridges OpenWA session lifecycle → Bluecoys reward callbacks. Always active.
 *
 * Every hook first checks the session carries a Bluecoys binding (readBluecoysConfig): sessions
 * created outside the Bluecoys flow (dashboard, native API) are ignored, so this is safe to run on
 * a shared instance. The hooks are login-method-agnostic — QR or pairing code, both end in
 * session:ready — so any new login route added to the controller gets the callbacks for free.
 *
 *   session:qr           → refresh the QR expiry hint the link-qr route reports
 *   session:ready        → phone matches the claimed number? → POST whatsapp-linked (credit reward)
 *   session:disconnected → terminal unlink only              → GET  whatsapp-disconnected (reverse)
 */
@Injectable()
export class BluecoysHooksService implements OnModuleInit, OnModuleDestroy {
  private readyHookId?: string;
  private disconnectedHookId?: string;
  private qrHookId?: string;

  constructor(
    private readonly hookManager: HookManager,
    private readonly callbacks: BluecoysCallbackService,
    private readonly qrState: BluecoysQrStateService,
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
  ) {}

  onModuleInit(): void {
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

    // The account that actually linked must be the number the user claimed at link time —
    // otherwise no reward (the link routes also surface this as a 409 to the caller).
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

    // Only a TERMINAL unlink (user removed the device / logged out) reverses the reward; a
    // transient network drop that will reconnect must not claw it back.
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
