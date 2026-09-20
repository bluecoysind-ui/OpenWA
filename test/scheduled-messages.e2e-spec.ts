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

describe('Scheduled messages (e2e)', () => {
  let app: INestApplication<App>;
  let sessionRepo: Repository<Session>;
  let apiKey: string;
  let viewerKey: string;

  let sessionSeq = 0;
  const nextSession = async (): Promise<string> => {
    const session = await sessionRepo.save(sessionRepo.create({ name: `e2e-sched-${Date.now()}-${sessionSeq++}` }));
    return session.id;
  };

  const sendAt = () => new Date(Date.now() + 3_600_000).toISOString();

  const createJob = async (session: string, overrides: Record<string, unknown> = {}) => {
    const res = await request(app.getHttpServer())
      .post(`/api/sessions/${session}/scheduled-messages`)
      .set('X-API-Key', apiKey)
      .send({ chatId: '628111@c.us', sendAt: sendAt(), text: 'later', timezone: 'UTC', ...overrides })
      .expect(201);
    return res.body as Record<string, unknown>;
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
    apiKey = (await authService.createApiKey({ name: 'e2e-sched-admin', role: ApiKeyRole.ADMIN })).rawKey;
    viewerKey = (await authService.createApiKey({ name: 'e2e-sched-viewer', role: ApiKeyRole.VIEWER })).rawKey;
  });

  afterAll(async () => {
    try {
      await app?.close();
    } catch {
      /* ignore teardown-only multi-datasource quirk */
    }
  });

  it('creates, lists, reads, patches, and cancels a pending job', async () => {
    const session = await nextSession();
    const job = await createJob(session);
    expect(job.status).toBe('pending');
    expect(typeof job.sendAt).toBe('string');

    const listed = await request(app.getHttpServer())
      .get(`/api/sessions/${session}/scheduled-messages`)
      .set('X-API-Key', viewerKey)
      .expect(200);
    expect((listed.body as Array<{ id: string }>).map(j => j.id)).toEqual([job.id]);

    const later = new Date(Date.now() + 7_200_000).toISOString();
    const patched = await request(app.getHttpServer())
      .patch(`/api/sessions/${session}/scheduled-messages/${job.id as string}`)
      .set('X-API-Key', apiKey)
      .send({ sendAt: later, text: 'updated' })
      .expect(200);
    expect((patched.body as { text: string }).text).toBe('updated');

    await request(app.getHttpServer())
      .delete(`/api/sessions/${session}/scheduled-messages/${job.id as string}`)
      .set('X-API-Key', apiKey)
      .expect(204);

    const cancelled = await request(app.getHttpServer())
      .get(`/api/sessions/${session}/scheduled-messages/${job.id as string}`)
      .set('X-API-Key', viewerKey)
      .expect(200);
    expect((cancelled.body as { status: string }).status).toBe('cancelled');
  });

  it('refuses a VIEWER mutating the schedule and fences jobs to their session', async () => {
    const a = await nextSession();
    const b = await nextSession();
    const job = await createJob(a);

    await request(app.getHttpServer())
      .post(`/api/sessions/${a}/scheduled-messages`)
      .set('X-API-Key', viewerKey)
      .send({ chatId: '628111@c.us', sendAt: sendAt(), text: 'nope' })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/sessions/${b}/scheduled-messages/${job.id as string}`)
      .set('X-API-Key', apiKey)
      .expect(404);
  });

  it('refuses a naive sendAt and a job with neither text nor mediaUrl', async () => {
    const session = await nextSession();
    await request(app.getHttpServer())
      .post(`/api/sessions/${session}/scheduled-messages`)
      .set('X-API-Key', apiKey)
      .send({ chatId: '628111@c.us', sendAt: '2026-09-21T15:00:00', text: 'x' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/sessions/${session}/scheduled-messages`)
      .set('X-API-Key', apiKey)
      .send({ chatId: '628111@c.us', sendAt: sendAt() })
      .expect(400);
  });

  it('creates a daily job, pauses, and resumes it', async () => {
    const session = await nextSession();
    const job = await createJob(session, { recurrence: 'daily', maxOccurrences: 5, timezone: 'UTC' });
    expect(job.recurrence).toBe('daily');
    expect(job.maxOccurrences).toBe(5);
    expect(job.interval).toBe(1);

    const paused = await request(app.getHttpServer())
      .patch(`/api/sessions/${session}/scheduled-messages/${job.id as string}`)
      .set('X-API-Key', apiKey)
      .send({ status: 'paused' })
      .expect(200);
    expect((paused.body as { status: string }).status).toBe('paused');

    const resumed = await request(app.getHttpServer())
      .patch(`/api/sessions/${session}/scheduled-messages/${job.id as string}`)
      .set('X-API-Key', apiKey)
      .send({ status: 'pending' })
      .expect(200);
    expect((resumed.body as { status: string }).status).toBe('pending');
  });

  it('refuses recurring without until or maxOccurrences', async () => {
    const session = await nextSession();
    await request(app.getHttpServer())
      .post(`/api/sessions/${session}/scheduled-messages`)
      .set('X-API-Key', apiKey)
      .send({ chatId: '628111@c.us', sendAt: sendAt(), text: 'x', recurrence: 'daily' })
      .expect(400);
  });
});
