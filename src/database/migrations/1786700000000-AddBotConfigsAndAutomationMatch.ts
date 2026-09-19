import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WP4b: match/chat/media columns on automation_rules, plus bot_configs (access lists, prefix,
 * commands, autoRead, alwaysOnline, welcome). CASCADE FK to sessions. Dual-dialect; idempotent.
 */
export class AddBotConfigsAndAutomationMatch1786700000000 implements MigrationInterface {
  name = 'AddBotConfigsAndAutomationMatch1786700000000';

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    if (queryRunner.connection.options.type === 'postgres') {
      const rows = (await queryRunner.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`,
        [table, column],
      )) as unknown[];
      return rows.length > 0;
    }
    const rows = (await queryRunner.query(`PRAGMA table_info("${table}")`)) as Array<{ name: string }>;
    return rows.some(r => r.name === column);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.dataSource.options.type === 'postgres';

    if (await queryRunner.hasTable('automation_rules')) {
      if (!(await this.hasColumn(queryRunner, 'automation_rules', 'matchMode'))) {
        await queryRunner.query(
          isPostgres
            ? `ALTER TABLE "automation_rules" ADD COLUMN "matchMode" varchar(16) NOT NULL DEFAULT 'contains'`
            : `ALTER TABLE "automation_rules" ADD COLUMN "matchMode" varchar(16) NOT NULL DEFAULT 'contains'`,
        );
      }
      if (!(await this.hasColumn(queryRunner, 'automation_rules', 'matchPattern'))) {
        await queryRunner.query(`ALTER TABLE "automation_rules" ADD COLUMN "matchPattern" text`);
      }
      if (!(await this.hasColumn(queryRunner, 'automation_rules', 'chatContext'))) {
        await queryRunner.query(
          `ALTER TABLE "automation_rules" ADD COLUMN "chatContext" varchar(16) NOT NULL DEFAULT 'all'`,
        );
      }
      if (!(await this.hasColumn(queryRunner, 'automation_rules', 'replyMediaUrl'))) {
        await queryRunner.query(`ALTER TABLE "automation_rules" ADD COLUMN "replyMediaUrl" text`);
      }
    }

    if (await queryRunner.hasTable('bot_configs')) return;

    if (isPostgres) {
      await queryRunner.query(
        `CREATE TABLE "bot_configs" ("id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar, ` +
          `"sessionId" varchar NOT NULL, "accessMode" varchar(16) NOT NULL DEFAULT 'all', ` +
          `"allowList" text NOT NULL DEFAULT '[]', "blockList" text NOT NULL DEFAULT '[]', ` +
          `"prefix" varchar(8) NOT NULL DEFAULT '#', "commandsEnabled" boolean NOT NULL DEFAULT true, ` +
          `"autoRead" boolean NOT NULL DEFAULT false, "alwaysOnline" boolean NOT NULL DEFAULT false, ` +
          `"welcomeMessage" text, ` +
          `"createdAt" timestamp NOT NULL DEFAULT NOW(), "updatedAt" timestamp NOT NULL DEFAULT NOW(), ` +
          `CONSTRAINT "UQ_bot_configs_sessionId" UNIQUE ("sessionId"), ` +
          `CONSTRAINT "FK_bot_configs_sessionId" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE)`,
      );
    } else {
      await queryRunner.query(
        `CREATE TABLE "bot_configs" ("id" varchar PRIMARY KEY NOT NULL, ` +
          `"sessionId" varchar NOT NULL, "accessMode" varchar(16) NOT NULL DEFAULT ('all'), ` +
          `"allowList" text NOT NULL DEFAULT ('[]'), "blockList" text NOT NULL DEFAULT ('[]'), ` +
          `"prefix" varchar(8) NOT NULL DEFAULT ('#'), "commandsEnabled" boolean NOT NULL DEFAULT (1), ` +
          `"autoRead" boolean NOT NULL DEFAULT (0), "alwaysOnline" boolean NOT NULL DEFAULT (0), ` +
          `"welcomeMessage" text, ` +
          `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
          `CONSTRAINT "UQ_bot_configs_sessionId" UNIQUE ("sessionId"), ` +
          `CONSTRAINT "FK_bot_configs_sessionId" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
      );
    }

    await queryRunner.query(`CREATE INDEX "IDX_bot_configs_sessionId" ON "bot_configs" ("sessionId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bot_configs_sessionId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bot_configs"`);
    if (!(await queryRunner.hasTable('automation_rules'))) return;
    if (await this.hasColumn(queryRunner, 'automation_rules', 'replyMediaUrl')) {
      await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "replyMediaUrl"`);
    }
    if (await this.hasColumn(queryRunner, 'automation_rules', 'chatContext')) {
      await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "chatContext"`);
    }
    if (await this.hasColumn(queryRunner, 'automation_rules', 'matchPattern')) {
      await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "matchPattern"`);
    }
    if (await this.hasColumn(queryRunner, 'automation_rules', 'matchMode')) {
      await queryRunner.query(`ALTER TABLE "automation_rules" DROP COLUMN "matchMode"`);
    }
  }
}
