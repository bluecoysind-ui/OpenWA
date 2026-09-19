// archiver v8 is ESM-only (pulled in transitively via @Global StorageModule); stub for ts-jest CJS.
jest.mock('archiver', () => ({ TarArchive: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotImplementedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { applyGlobalValidation } from './../src/config/app-validation';
import { AuthService } from './../src/modules/auth/auth.service';
import { ApiKeyRole } from './../src/modules/auth/entities/api-key.entity';
import { Session } from './../src/modules/session/entities/session.entity';
import { EngineRegistry } from './../src/engine/engine-registry.service';
import type { IWhatsAppEngine } from './../src/engine/interfaces/whatsapp-engine.interface';

describe('WP3 session profile, bulk contact check, mute durationSec (e2e)', () => {
  let app: INestApplication<App>;
  let sessionId: string;
  let operatorKey: string;
  let viewerKey: string;

  const engine = {
    getOwnProfile: jest.fn().mockResolvedValue({
      phone: '628123456789',
      pushName: 'Ada',
      about: 'Busy',
      profilePictureUrl: 'https://pps.example/n.jpg',
    }),
    checkNumbers: jest.fn().mockResolvedValue([{ number: '628123456789', exists: true, chatId: '628123456789@c.us' }]),
    getNumberId: jest.fn().mockResolvedValue('628111@c.us'),
    muteChat: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    applyGlobalValidation(app);
    await app.init();

    const sessionRepo: Repository<Session> = app.get(getRepositoryToken(Session, 'data'));
    sessionId = (await sessionRepo.save(sessionRepo.create({ name: `e2e-wp3-${Date.now()}` }))).id;
    app.get(EngineRegistry).set(sessionId, engine as unknown as IWhatsAppEngine);
    operatorKey = (
      await app.get(AuthService).createApiKey({ name: `e2e-wp3-op-${Date.now()}`, role: ApiKeyRole.OPERATOR })
    ).rawKey;
    viewerKey = (
      await app.get(AuthService).createApiKey({ name: `e2e-wp3-view-${Date.now()}`, role: ApiKeyRole.VIEWER })
    ).rawKey;
  });

  afterAll(async () => {
    try {
      await app?.close();
    } catch {
      /* ignore teardown-only multi-datasource quirk */
    }
  });

  beforeEach(() => jest.clearAllMocks());

  it('GET profile without an API key is 401 and a viewer key is 200', async () => {
    await request(app.getHttpServer()).get(`/api/sessions/${sessionId}/profile`).expect(401);
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/profile`)
      .set('X-API-Key', viewerKey)
      .expect(200);
    expect(res.body).toEqual({
      phone: '628123456789',
      pushName: 'Ada',
      about: 'Busy',
      profilePictureUrl: 'https://pps.example/n.jpg',
    });
  });

  it('GET profile on a not-started session is 400', async () => {
    const sessionRepo: Repository<Session> = app.get(getRepositoryToken(Session, 'data'));
    const idle = await sessionRepo.save(sessionRepo.create({ name: `e2e-wp3-idle-${Date.now()}` }));
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${idle.id}/profile`)
      .set('X-API-Key', operatorKey)
      .expect(400);
    expect((res.body as { message: string }).message).toMatch(/not started/i);
  });

  it('GET profile surfaces an engine 501', async () => {
    engine.getOwnProfile.mockRejectedValueOnce(new NotImplementedException('not supported'));
    await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/profile`)
      .set('X-API-Key', operatorKey)
      .expect(501);
  });

  it('a scoped operator key cannot read another session profile', async () => {
    const sessionRepo: Repository<Session> = app.get(getRepositoryToken(Session, 'data'));
    const other = await sessionRepo.save(sessionRepo.create({ name: `e2e-wp3-other-${Date.now()}` }));
    const scoped = (
      await app.get(AuthService).createApiKey({
        name: `e2e-wp3-scoped-${Date.now()}`,
        role: ApiKeyRole.OPERATOR,
        allowedSessions: [sessionId],
      })
    ).rawKey;
    await request(app.getHttpServer()).get(`/api/sessions/${other.id}/profile`).set('X-API-Key', scoped).expect(401);
  });

  it('POST contacts/check returns per-item results and keeps GET check/:number unchanged', async () => {
    const bulk = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/contacts/check`)
      .set('X-API-Key', operatorKey)
      .send({ numbers: ['628123456789', 'nope'] })
      .expect(200);
    expect(bulk.body).toEqual({
      results: [
        { input: '628123456789', normalized: '628123456789', exists: true, chatId: '628123456789@c.us' },
        { input: 'nope', normalized: null, exists: false, chatId: null, error: 'invalid' },
      ],
    });
    expect(engine.checkNumbers).toHaveBeenCalledWith(['628123456789']);

    engine.checkNumbers.mockClear();
    const single = await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/contacts/check/628111`)
      .set('X-API-Key', operatorKey)
      .expect(200);
    expect(engine.checkNumbers).not.toHaveBeenCalled();
    expect(engine.getNumberId).toHaveBeenCalledWith('628111');
    expect(single.body).toEqual({ number: '628111', exists: true, whatsappId: '628111@c.us' });
  });

  it('POST contacts/check without a key is 401 and a viewer key is 403', async () => {
    await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/contacts/check`)
      .send({ numbers: ['628123456789'] })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/contacts/check`)
      .set('X-API-Key', viewerKey)
      .send({ numbers: ['628123456789'] })
      .expect(403);
  });

  it('POST contacts/check rejects more than 50 numbers', async () => {
    const numbers = Array.from({ length: 51 }, (_, i) => `6280000000${String(i).padStart(2, '0')}`);
    await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/contacts/check`)
      .set('X-API-Key', operatorKey)
      .send({ numbers })
      .expect(400);
  });

  it('POST chats/mute durationSec maps to muteUntil; both fields are 400; null still unmutes', async () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    try {
      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/chats/mute`)
        .set('X-API-Key', operatorKey)
        .send({ chatId: '628123@c.us', durationSec: 60 })
        .expect(200);
      expect(engine.muteChat).toHaveBeenCalledWith('628123@c.us', 1_700_000_060_000);

      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/chats/mute`)
        .set('X-API-Key', operatorKey)
        .send({ chatId: '628123@c.us', durationSec: 60, muteUntil: 1_800_000_000_000 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/chats/mute`)
        .set('X-API-Key', operatorKey)
        .send({ chatId: '628123@c.us', muteUntil: null })
        .expect(200);
      expect(engine.muteChat).toHaveBeenCalledWith('628123@c.us', null);
    } finally {
      spy.mockRestore();
    }
  });
});
