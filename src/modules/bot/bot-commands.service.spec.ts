import { BotCommandsService } from './bot-commands.service';
import { BotConfigService } from './bot-config.service';
import { BotAccessMode } from './bot-access';
import type { HookManager } from '../../core/hooks';
import type { ModuleRef } from '@nestjs/core';
import type { ConfigService } from '@nestjs/config';

describe('BotCommandsService', () => {
  const texts: Array<{ chatId: string; text: string }> = [];
  const stickers: Array<{ chatId?: string; url: string }> = [];

  const botConfig = {
    get: () =>
      Promise.resolve({
        accessMode: BotAccessMode.ALL,
        allowList: [],
        blockList: [],
        prefix: '#',
        commandsEnabled: true,
        autoRead: false,
        alwaysOnline: false,
        welcomeMessage: null,
      }),
    senderAllowed: () => Promise.resolve(true),
    maybeAutoRead: () => Promise.resolve(undefined),
  } as unknown as BotConfigService;

  const moduleRef = {
    get: () => ({
      sendText: (_s: string, dto: { chatId: string; text: string }) => {
        texts.push(dto);
        return Promise.resolve({});
      },
      sendSticker: (_s: string, dto: { url: string }) => {
        stickers.push(dto);
        return Promise.resolve({});
      },
    }),
  } as unknown as ModuleRef;

  const register = jest.fn();
  const hooks = { register, unregister: jest.fn() } as unknown as HookManager;

  beforeEach(() => {
    texts.length = 0;
    stickers.length = 0;
  });

  const inbound = (body: string): Record<string, unknown> => ({
    chatId: '628111@c.us',
    from: '628111@c.us',
    body,
    fromMe: false,
    isGroup: false,
  });

  it('does not subscribe when BOT_COMMANDS is off', () => {
    const svc = new BotCommandsService(botConfig, hooks, { get: () => false } as unknown as ConfigService, moduleRef);
    svc.onModuleInit();
    expect(register.mock.calls.length).toBe(0);
  });

  it('subscribes to message:received when BOT_COMMANDS is on', () => {
    const svc = new BotCommandsService(botConfig, hooks, { get: () => true } as unknown as ConfigService, moduleRef);
    svc.onModuleInit();
    expect(register).toHaveBeenCalledWith('openwa-bot-commands', 'message:received', expect.any(Function), 40);
  });

  it('replies pong / id / menu and sends a sticker from a URL', async () => {
    const svc = new BotCommandsService(botConfig, hooks, { get: () => true } as unknown as ConfigService, moduleRef);
    expect(await svc.handleInbound('sessA', inbound('#ping'))).toBe(true);
    expect(texts[0].text).toBe('pong');
    expect(await svc.handleInbound('sessA', inbound('#id'))).toBe(true);
    expect(texts[1].text).toContain('sessA');
    expect(await svc.handleInbound('sessA', inbound('#menu'))).toBe(true);
    expect(texts[2].text).toContain('#sticker');
    expect(await svc.handleInbound('sessA', inbound('#sticker https://example.com/a.webp'))).toBe(true);
    expect(stickers).toEqual([{ chatId: '628111@c.us', url: 'https://example.com/a.webp' }]);
  });

  it('accepts WA-AKG aliases s/stiker → sticker and help → menu', async () => {
    const svc = new BotCommandsService(botConfig, hooks, { get: () => true } as unknown as ConfigService, moduleRef);
    expect(await svc.handleInbound('sessA', inbound('#help'))).toBe(true);
    expect(texts[0].text).toContain('#sticker');
    expect(await svc.handleInbound('sessA', inbound('#s https://example.com/b.webp'))).toBe(true);
    expect(await svc.handleInbound('sessA', inbound('#stiker https://example.com/c.webp'))).toBe(true);
    expect(stickers).toEqual([
      { chatId: '628111@c.us', url: 'https://example.com/b.webp' },
      { chatId: '628111@c.us', url: 'https://example.com/c.webp' },
    ]);
  });

  it('skips fromMe and unknown commands', async () => {
    const svc = new BotCommandsService(botConfig, hooks, { get: () => true } as unknown as ConfigService, moduleRef);
    expect(await svc.handleInbound('sessA', inbound('#ping'))).toBe(true);
    texts.length = 0;
    expect(await svc.handleInbound('sessA', { ...inbound('#ping'), fromMe: true })).toBe(false);
    expect(await svc.handleInbound('sessA', inbound('#nope'))).toBe(false);
    expect(texts).toHaveLength(0);
  });
});
