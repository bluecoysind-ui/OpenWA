import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `scheduled_messages` — one-shot delayed sends (WP4a). CASCADE FK to sessions: a job has
 * no meaning after its session is gone. Hand-authored because `synchronize` is off on the `data`
 * connection for Postgres (and optional on SQLite).
 */
export class AddScheduledMessages1786600000000 implements MigrationInterface {
  name = 'AddScheduledMessages1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('scheduled_messages')) return;
    const isPostgres = queryRunner.dataSource.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(
        `CREATE TABLE "scheduled_messages" ("id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar, ` +
          `"sessionId" varchar NOT NULL, "chatId" varchar NOT NULL, "sendAtUtc" timestamp NOT NULL, ` +
          `"timezone" varchar(64) NOT NULL DEFAULT 'UTC', "text" text, "mediaUrl" text, ` +
          `"mediaType" varchar(16) NOT NULL DEFAULT 'text', "caption" text, ` +
          `"status" varchar(16) NOT NULL DEFAULT 'pending', "attemptCount" integer NOT NULL DEFAULT 0, ` +
          `"lastError" text, "sentMessageId" varchar, ` +
          `"createdAt" timestamp NOT NULL DEFAULT NOW(), "updatedAt" timestamp NOT NULL DEFAULT NOW(), ` +
          `CONSTRAINT "FK_scheduled_messages_sessionId" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE)`,
      );
    } else {
      await queryRunner.query(
        `CREATE TABLE "scheduled_messages" ("id" varchar PRIMARY KEY NOT NULL, ` +
          `"sessionId" varchar NOT NULL, "chatId" varchar NOT NULL, "sendAtUtc" datetime NOT NULL, ` +
          `"timezone" varchar(64) NOT NULL DEFAULT ('UTC'), "text" text, "mediaUrl" text, ` +
          `"mediaType" varchar(16) NOT NULL DEFAULT ('text'), "caption" text, ` +
          `"status" varchar(16) NOT NULL DEFAULT ('pending'), "attemptCount" integer NOT NULL DEFAULT (0), ` +
          `"lastError" text, "sentMessageId" varchar, ` +
          `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
          `CONSTRAINT "FK_scheduled_messages_sessionId" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
      );
    }

    await queryRunner.query(`CREATE INDEX "IDX_scheduled_messages_sessionId" ON "scheduled_messages" ("sessionId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_scheduled_messages_due" ON "scheduled_messages" ("status", "sendAtUtc")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scheduled_messages_due"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scheduled_messages_sessionId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_messages"`);
  }
}
