import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recurring scheduled messages (daily/weekly/monthly) plus bot sticker pack/author.
 * Dual-dialect; idempotent ADD COLUMN.
 */
export class AddSchedulerRecurrenceAndStickerPack1786900000000 implements MigrationInterface {
  name = 'AddSchedulerRecurrenceAndStickerPack1786900000000';

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

  private async addColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    ddl: string,
  ): Promise<void> {
    if (!(await queryRunner.hasTable(table))) return;
    if (await this.hasColumn(queryRunner, table, column)) return;
    await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.dataSource.options.type === 'postgres';
    const intType = isPostgres ? 'integer' : 'integer';
    const dtType = isPostgres ? 'timestamp' : 'datetime';

    await this.addColumn(
      queryRunner,
      'scheduled_messages',
      'recurrence',
      `"recurrence" varchar(16) NOT NULL DEFAULT 'none'`,
    );
    await this.addColumn(
      queryRunner,
      'scheduled_messages',
      'recurrenceInterval',
      `"recurrenceInterval" ${intType} NOT NULL DEFAULT 1`,
    );
    await this.addColumn(queryRunner, 'scheduled_messages', 'daysOfWeek', `"daysOfWeek" text`);
    await this.addColumn(queryRunner, 'scheduled_messages', 'dayOfMonth', `"dayOfMonth" ${intType}`);
    await this.addColumn(queryRunner, 'scheduled_messages', 'untilUtc', `"untilUtc" ${dtType}`);
    await this.addColumn(queryRunner, 'scheduled_messages', 'maxOccurrences', `"maxOccurrences" ${intType}`);
    await this.addColumn(
      queryRunner,
      'scheduled_messages',
      'occurrenceCount',
      `"occurrenceCount" ${intType} NOT NULL DEFAULT 0`,
    );
    await this.addColumn(queryRunner, 'scheduled_messages', 'anchorAtUtc', `"anchorAtUtc" ${dtType}`);

    await this.addColumn(queryRunner, 'bot_configs', 'stickerPackName', `"stickerPackName" varchar(128)`);
    await this.addColumn(queryRunner, 'bot_configs', 'stickerPackAuthor', `"stickerPackAuthor" varchar(128)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const drop = async (table: string, column: string) => {
      if (!(await queryRunner.hasTable(table))) return;
      if (!(await this.hasColumn(queryRunner, table, column))) return;
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
    };
    await drop('scheduled_messages', 'anchorAtUtc');
    await drop('scheduled_messages', 'occurrenceCount');
    await drop('scheduled_messages', 'maxOccurrences');
    await drop('scheduled_messages', 'untilUtc');
    await drop('scheduled_messages', 'dayOfMonth');
    await drop('scheduled_messages', 'daysOfWeek');
    await drop('scheduled_messages', 'recurrenceInterval');
    await drop('scheduled_messages', 'recurrence');
    await drop('bot_configs', 'stickerPackAuthor');
    await drop('bot_configs', 'stickerPackName');
  }
}
