import { DataSource } from 'typeorm';
import { BotConfigService } from './bot-config.service';
import { BotConfig } from './entities/bot-config.entity';
import { Session, SessionStatus } from '../session/entities/session.entity';
import { BotAccessMode } from './bot-access';
import type { ModuleRef } from '@nestjs/core';

describe('BotConfigService', () => {
  let ds: DataSource;
  let service: BotConfigService;
  let seen: string[];
  let texts: Array<{ chatId: string; text: string }>;

  beforeEach(async () => {
    ds = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Session, BotConfig],
      synchronize: true,
    });
    await ds.initialize();
    await ds
      .getRepository(Session)
      .save(ds.getRepository(Session).create({ id: 'sessA', name: 'sessA', status: SessionStatus.READY, config: {} }));
    seen = [];
    texts = [];
    const moduleRef = {
      get: () => ({
        getEngine: () => ({
          sendSeen: (chatId: string) => {
            seen.push(chatId);
            return Promise.resolve(true);
          },
          setOnlinePresence: () => Promise.resolve(),
        }),
        sendText: (_s: string, dto: { chatId: string; text: string }) => {
          texts.push(dto);
          return Promise.resolve({});
        },
      }),
    } as unknown as ModuleRef;
    service = new BotConfigService(ds.getRepository(BotConfig), moduleRef);
  });

  afterEach(async () => {
    await ds.destroy();
  });

  it('GET without a row returns defaults and does not insert', async () => {
    const cfg = await service.get('sessA');
    expect(cfg.accessMode).toBe(BotAccessMode.ALL);
    expect(cfg.prefix).toBe('#');
    expect(cfg.commandsEnabled).toBe(true);
    expect(await ds.getRepository(BotConfig).count()).toBe(0);
  });

  it('PUT upserts and subsequent GET returns the saved row', async () => {
    const saved = await service.upsert('sessA', {
      accessMode: BotAccessMode.ALLOW,
      allowList: ['628111@c.us'],
      prefix: '!',
      autoRead: true,
      welcomeMessage: 'hi group',
    });
    expect(saved.accessMode).toBe(BotAccessMode.ALLOW);
    expect((await service.get('sessA')).prefix).toBe('!');
    expect(await ds.getRepository(BotConfig).count()).toBe(1);
  });

  it('senderAllowed uses the stored lists', async () => {
    await service.upsert('sessA', { accessMode: BotAccessMode.ALLOW, allowList: ['628111'] });
    expect(await service.senderAllowed('sessA', '628111@c.us', false)).toBe(true);
    expect(await service.senderAllowed('sessA', '628999@c.us', false)).toBe(false);
  });

  it('handleGroupJoin sends welcome through the paced text path', async () => {
    await service.upsert('sessA', { welcomeMessage: 'welcome' });
    await service.handleGroupJoin('sessA', 'g@g.us');
    expect(texts).toEqual([{ chatId: 'g@g.us', text: 'welcome' }]);
  });

  it('maybeAutoRead no-ops unless autoRead is on', async () => {
    await service.maybeAutoRead('sessA', 'c@c.us');
    expect(seen).toHaveLength(0);
    await service.upsert('sessA', { autoRead: true });
    await service.maybeAutoRead('sessA', 'c@c.us');
    expect(seen).toEqual(['c@c.us']);
  });
});
