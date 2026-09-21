import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WP6: webhook_deliveries (Q6 attempt log) and media_objects (MEDIA_PERSIST index). Dual-dialect.
 */
export class AddWebhookDeliveriesAndMediaObjects1786800000000 implements MigrationInterface {
  name = 'AddWebhookDeliveriesAndMediaObjects1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.dataSource.options.type === 'postgres';
    const id = isPostgres
      ? `"id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar`
      : `"id" varchar PRIMARY KEY NOT NULL`;
    const created = isPostgres ? 'timestamp NOT NULL DEFAULT NOW()' : `datetime NOT NULL DEFAULT (datetime('now'))`;

    if (!(await queryRunner.hasTable('webhook_deliveries'))) {
      await queryRunner.query(
        `CREATE TABLE "webhook_deliveries" (${id}, "webhookId" varchar NOT NULL, "sessionId" varchar NOT NULL, ` +
          `"status" varchar(16) NOT NULL, "httpCode" integer, "durationMs" integer NOT NULL, ` +
          `"attempt" integer NOT NULL, "errorSnippet" varchar(200), "createdAt" ${created})`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_webhook_deliveries_webhookId_createdAt" ON "webhook_deliveries" ("webhookId", "createdAt")`,
      );
    }

    if (!(await queryRunner.hasTable('media_objects'))) {
      await queryRunner.query(
        `CREATE TABLE "media_objects" (${id}, "sessionId" varchar NOT NULL, "storageKey" varchar NOT NULL, ` +
          `"messageId" varchar, "createdAt" ${created})`,
      );
      await queryRunner.query(`CREATE UNIQUE INDEX "UQ_media_objects_storageKey" ON "media_objects" ("storageKey")`);
      await queryRunner.query(
        `CREATE INDEX "IDX_media_objects_sessionId_createdAt" ON "media_objects" ("sessionId", "createdAt")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "media_objects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries"`);
  }
}
