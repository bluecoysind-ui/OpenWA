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

describe('Webhook deliveries (e2e)', () => {
  let app: INestApplication<App>;
  let sessionRepo: Repository<Session>;
  let apiKey: string;
  let viewerKey: string;
  let sessionId: string;
  let webhookId: string;
  const prevSsrf = process.env.WEBHOOK_SSRF_PROTECT;

  beforeAll(async () => {
    process.env.WEBHOOK_SSRF_PROTECT = 'false';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
    sessionRepo = app.get(getRepositoryToken(Session, 'data'));
    const authService = app.get(AuthService);
    apiKey = (await authService.createApiKey({ name: 'e2e-deliveries-admin', role: ApiKeyRole.ADMIN })).rawKey;
    viewerKey = (await authService.createApiKey({ name: 'e2e-deliveries-viewer', role: ApiKeyRole.VIEWER })).rawKey;
    const session = await sessionRepo.save(sessionRepo.create({ name: `e2e-deliveries-${Date.now()}` }));
    sessionId = session.id;
    const created = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/webhooks`)
      .set('X-API-Key', apiKey)
      .send({ url: 'https://example.com/hook', events: ['message.received'] })
      .expect(201);
    webhookId = String((created.body as { id: string }).id);
  });

  afterAll(async () => {
    if (prevSsrf === undefined) delete process.env.WEBHOOK_SSRF_PROTECT;
    else process.env.WEBHOOK_SSRF_PROTECT = prevSsrf;
    try {
      await app?.close();
    } catch {
      /* ignore teardown-only multi-datasource quirk */
    }
  });

  it('VIEWER cannot list deliveries', async () => {
    await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/webhooks/${webhookId}/deliveries`)
      .set('X-API-Key', viewerKey)
      .expect(403);
  });

  it('OPERATOR lists an empty attempt log for a new webhook', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/webhooks/${webhookId}/deliveries`)
      .set('X-API-Key', apiKey)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it('unknown webhook is 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/sessions/${sessionId}/webhooks/00000000-0000-0000-0000-000000000000/deliveries`)
      .set('X-API-Key', apiKey)
      .expect(404);
  });
});
