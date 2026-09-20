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

describe('Media convert/sticker (e2e)', () => {
  let app: INestApplication<App>;
  let sessionRepo: Repository<Session>;
  let apiKey: string;
  let viewerKey: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    applyGlobalValidation(app);
    await app.init();
    sessionRepo = app.get(getRepositoryToken(Session, 'data'));
    const authService = app.get(AuthService);
    apiKey = (await authService.createApiKey({ name: 'e2e-sticker-admin', role: ApiKeyRole.ADMIN })).rawKey;
    viewerKey = (await authService.createApiKey({ name: 'e2e-sticker-viewer', role: ApiKeyRole.VIEWER })).rawKey;
    const session = await sessionRepo.save(sessionRepo.create({ name: `e2e-sticker-${Date.now()}` }));
    sessionId = session.id;
  });

  afterAll(async () => {
    try {
      await app?.close();
    } catch {
      /* ignore teardown-only multi-datasource quirk */
    }
  });

  it('VIEWER cannot convert stickers', async () => {
    await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/media/convert/sticker`)
      .set('X-API-Key', viewerKey)
      .send({ base64: 'AAAA' })
      .expect(403);
  });

  it('OPERATOR gets 503 when conversion is off, not 404', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionId}/media/convert/sticker`)
      .set('X-API-Key', apiKey)
      .send({ base64: Buffer.from('tiny').toString('base64') })
      .expect(503);
    expect(JSON.stringify(res.body)).toMatch(/disabled|ffmpeg/i);
  });
});
