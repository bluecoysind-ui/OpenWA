// archiver v8 is ESM-only (pulled in transitively via @Global StorageModule); stub for ts-jest CJS.
jest.mock('archiver', () => ({ TarArchive: jest.fn() }));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { applyGlobalValidation } from './../src/config/app-validation';
import { AuthService } from './../src/modules/auth/auth.service';
import { ApiKeyRole } from './../src/modules/auth/entities/api-key.entity';
import { Session } from './../src/modules/session/entities/session.entity';

describe('Bot config (e2e)', () => {
  let app: INestApplication<App>;
  let sessionRepo: Repository<Session>;
  let apiKey: string;
  let viewerKey: string;
  let sessionSeq = 0;

  const nextSession = async (): Promise<string> => {
    const session = await sessionRepo.save(sessionRepo.create({ name: `e2e-bot-${Date.now()}-${sessionSeq++}` }));
    return session.id;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
    sessionRepo = app.get(getRepositoryToken(Session, 'data'));
    const authService = app.get(AuthService);
    apiKey = (await authService.createApiKey({ name: 'e2e-bot-admin', role: ApiKeyRole.ADMIN })).rawKey;
    viewerKey = (await authService.createApiKey({ name: 'e2e-bot-viewer', role: ApiKeyRole.VIEWER })).rawKey;
  });

  afterAll(async () => {
    try {
      await app?.close();
    } catch {
      /* ignore teardown-only multi-datasource quirk */
    }
  });

  it('GET returns defaults before any PUT', async () => {
    const session = await nextSession();
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${session}/bot-config`)
      .set('X-API-Key', viewerKey)
      .expect(200);
    expect(res.body).toMatchObject({
      sessionId: session,
      accessMode: 'all',
      prefix: '#',
      commandsEnabled: true,
      autoRead: false,
    });
  });

  it('PUT upserts and GET reads the saved values', async () => {
    const session = await nextSession();
    const put = await request(app.getHttpServer())
      .put(`/api/sessions/${session}/bot-config`)
      .set('X-API-Key', apiKey)
      .send({
        accessMode: 'allow',
        allowList: ['628111@c.us'],
        prefix: '!',
        welcomeMessage: 'hi',
        autoRead: true,
      })
      .expect(200);
    expect(put.body).toMatchObject({ accessMode: 'allow', prefix: '!', autoRead: true });

    const get = await request(app.getHttpServer())
      .get(`/api/sessions/${session}/bot-config`)
      .set('X-API-Key', viewerKey)
      .expect(200);
    expect((get.body as { allowList: string[]; welcomeMessage: string }).allowList).toEqual(['628111@c.us']);
    expect((get.body as { welcomeMessage: string }).welcomeMessage).toBe('hi');
  });

  it('VIEWER cannot PUT; missing key is 401', async () => {
    const session = await nextSession();
    await request(app.getHttpServer()).get(`/api/sessions/${session}/bot-config`).expect(401);
    await request(app.getHttpServer())
      .put(`/api/sessions/${session}/bot-config`)
      .set('X-API-Key', viewerKey)
      .send({ prefix: '!' })
      .expect(403);
  });

  it('rejects an unknown accessMode', async () => {
    const session = await nextSession();
    await request(app.getHttpServer())
      .put(`/api/sessions/${session}/bot-config`)
      .set('X-API-Key', apiKey)
      .send({ accessMode: 'maybe' })
      .expect(400);
  });
});
