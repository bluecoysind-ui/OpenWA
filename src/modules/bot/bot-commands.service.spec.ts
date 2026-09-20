import { BotCommandsService } from './bot-commands.service';
import { BotConfigService } from './bot-config.service';
import { BotAccessMode } from './bot-access';
import { MediaConversionService } from '../media/media-conversion.service';
import { MessageService } from '../message/message.service';
import type { HookManager } from '../../core/hooks';
import type { ModuleRef } from '@nestjs/core';
import type { ConfigService } from '@nestjs/config';
import { PLUGIN_MESSAGE_PORT } from '../../core/plugins/plugin-host-ports';

describe('BotCommandsService', () => {
  const texts: Array<{ chatId: string; text: string }> = [];
  const stickers: Array<Record<string, unknown>> = [];
  const converted: Array<Record<string, unknown>> = [];
  let getChatMedia: jest.Mock;

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
        stickerPackName: 'OpenWA',
        stickerPackAuthor: 'bot',
      }),
    senderAllowed: () => Promise.resolve(true),
    maybeAutoRead: () => Promise.resolve(undefined),
  } as unknown as BotConfigService;

  const pluginPort = {
    sendText: (_s: string, dto: { chatId: string; text: string }) => {
      texts.push(dto);
      return Promise.resolve({});
    },
    sendSticker: (_s: string, dto: Record<string, unknown>) => {
      stickers.push(dto);
      return Promise.resolve({});
    },
  };

  const messageSvc = {
    sendText: pluginPort.sendText,
    sendSticker: (_s: string, dto: Record<string, unknown>) => {
      stickers.push(dto);
      return Promise.resolve({});
    },
    getChatMedia: (...args: unknown[]) => getChatMedia(...args),
  };

  const convertOk = (_s: string, dto: Record<string, unknown>) => {
    converted.push(dto);
    return Promise.resolve({ base64: 'WEBP', mimetype: 'image/webp', bytes: 4 });
  };

  const conversion = {
    convertToSticker: convertOk,
  };

  const moduleRef = {
    get: (token: unknown) => {
      if (token === MediaConversionService) return conversion;
      if (token === MessageService) return messageSvc;
      if (token === PLUGIN_MESSAGE_PORT) return pluginPort;
      return pluginPort;
    },
  } as unknown as ModuleRef;

  const register = jest.fn();
  const hooks = { register, unregister: jest.fn() } as unknown as HookManager;

  const config = (on: boolean, cooldown = 0) =>
    ({
      get: (key: string) => {
        if (key === 'features.botCommands') return on;
        if (key === 'bot.commandCooldownMs') return cooldown;
        return undefined;
      },
    }) as unknown as ConfigService;

  beforeEach(() => {
    texts.length = 0;
    stickers.length = 0;
    converted.length = 0;
    getChatMedia = jest.fn();
    conversion.convertToSticker = convertOk;
  });

  const inbound = (body: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    chatId: '628111@c.us',
    from: '628111@c.us',
    body,
    fromMe: false,
    isGroup: false,
    ...extra,
  });

  it('does not subscribe when BOT_COMMANDS is off', () => {
    const svc = new BotCommandsService(botConfig, hooks, config(false), moduleRef);
    svc.onModuleInit();
    expect(register.mock.calls.length).toBe(0);
  });

  it('subscribes to message:received when BOT_COMMANDS is on', () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    svc.onModuleInit();
    expect(register).toHaveBeenCalledWith('openwa-bot-commands', 'message:received', expect.any(Function), 40);
  });

  it('replies pong / id / menu and sends a sticker from a URL', async () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
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
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
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
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    expect(await svc.handleInbound('sessA', inbound('#ping'))).toBe(true);
    texts.length = 0;
    expect(await svc.handleInbound('sessA', { ...inbound('#ping'), fromMe: true })).toBe(false);
    expect(await svc.handleInbound('sessA', inbound('#nope'))).toBe(false);
    expect(texts).toHaveLength(0);
  });

  it('converts a captioned image to a sticker without remove.bg', async () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    expect(
      await svc.handleInbound(
        'sessA',
        inbound('#sticker', { type: 'image', media: { data: 'AAA', mimetype: 'image/jpeg' } }),
      ),
    ).toBe(true);
    expect(converted[0]).toEqual(
      expect.objectContaining({ base64: 'AAA', removeBg: false, packName: 'OpenWA', author: 'bot' }),
    );
    expect(stickers[0]).toEqual(
      expect.objectContaining({ chatId: '628111@c.us', base64: 'WEBP', packName: 'OpenWA', author: 'bot' }),
    );
  });

  it('converts a reply to an image via getChatMedia', async () => {
    getChatMedia.mockResolvedValue({ buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' });
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    expect(
      await svc.handleInbound(
        'sessA',
        inbound('#s', { quotedMessage: { id: 'wamid.q', type: 'image', hasMedia: true } }),
      ),
    ).toBe(true);
    expect(getChatMedia).toHaveBeenCalledWith('sessA', '628111@c.us', 'wamid.q');
    expect(converted[0]).toEqual(expect.objectContaining({ base64: Buffer.from('IMG').toString('base64'), removeBg: false }));
  });

  it('replies with a short error instead of throwing when conversion fails', async () => {
    conversion.convertToSticker = () => Promise.reject(new Error('ffmpeg missing'));
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    expect(
      await svc.handleInbound(
        'sessA',
        inbound('#sticker', { type: 'image', media: { data: 'AAA', mimetype: 'image/jpeg' } }),
      ),
    ).toBe(true);
    expect(texts.some(t => t.text.includes('ffmpeg missing'))).toBe(true);
  });

  it('honours per-sender cooldown', async () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true, 60_000), moduleRef);
    expect(await svc.handleInbound('sessA', inbound('#ping'))).toBe(true);
    expect(await svc.handleInbound('sessA', inbound('#ping'))).toBe(true);
    expect(texts).toHaveLength(1);
  });

  it('holds per-sender cooldown under concurrent same-sender commands', async () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true, 60_000), moduleRef);
    await Promise.all([
      svc.handleInbound('sessA', inbound('#ping')),
      svc.handleInbound('sessA', inbound('#ping')),
    ]);
    expect(texts).toHaveLength(1);
  });

  it('allows concurrent commands from different senders under cooldown', async () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true, 60_000), moduleRef);
    await Promise.all([
      svc.handleInbound('sessA', inbound('#ping', { from: '628111@c.us', author: '628111@c.us' })),
      svc.handleInbound('sessA', inbound('#ping', { from: '628222@c.us', author: '628222@c.us' })),
    ]);
    expect(texts).toHaveLength(2);
  });

  it('converts a captioned image in a group without remove.bg', async () => {
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    expect(
      await svc.handleInbound(
        'sessA',
        inbound('#sticker', {
          isGroup: true,
          chatId: '120363@g.us',
          author: '628111@c.us',
          type: 'image',
          media: { data: 'AAA', mimetype: 'image/jpeg' },
        }),
      ),
    ).toBe(true);
    expect(converted[0]).toEqual(
      expect.objectContaining({ base64: 'AAA', removeBg: false, packName: 'OpenWA', author: 'bot' }),
    );
    expect(stickers[0]).toEqual(expect.objectContaining({ chatId: '120363@g.us', base64: 'WEBP' }));
  });

  it('converts a reply to an image in a group via getChatMedia', async () => {
    getChatMedia.mockResolvedValue({ buffer: Buffer.from('IMG'), mimetype: 'image/jpeg' });
    const svc = new BotCommandsService(botConfig, hooks, config(true), moduleRef);
    expect(
      await svc.handleInbound(
        'sessA',
        inbound('#s', {
          isGroup: true,
          chatId: '120363@g.us',
          author: '628111@c.us',
          quotedMessage: { id: 'wamid.q', type: 'image', hasMedia: true },
        }),
      ),
    ).toBe(true);
    expect(getChatMedia).toHaveBeenCalledWith('sessA', '120363@g.us', 'wamid.q');
    expect(converted[0]).toEqual(
      expect.objectContaining({ base64: Buffer.from('IMG').toString('base64'), removeBg: false }),
    );
    expect(stickers[0]).toEqual(expect.objectContaining({ chatId: '120363@g.us' }));
  });
});
