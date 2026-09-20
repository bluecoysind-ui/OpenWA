import { DataSource } from 'typeorm';
import { readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Upgrade path from main (last migration 178650) plus up AND down of the WA-AKG
 * port migrations (178660/670/680/690) on SQLite.
 */
const importMigrations = (dir: string): Array<{ ts: number; Ctor: new () => { name?: string } }> => {
  const out: Array<{ ts: number; Ctor: new () => { name?: string } }> = [];
  for (const file of readdirSync(dir)
    .filter(f => f.endsWith('.ts') && !f.includes('__tests__') && !f.endsWith('.spec.ts'))
    .sort()) {
    const ts = parseInt(file, 10);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(join(dir, file)) as Record<string, unknown>;
    const Ctor = Object.values(mod).find(
      (v): v is new () => { name?: string } =>
        typeof v === 'function' && (v as { prototype?: { up?: unknown } }).prototype?.up !== undefined,
    );
    if (!Ctor) throw new Error(`Non-migration file in chain dir: ${file}`);
    out.push({ ts, Ctor });
  }
  return out;
};

const repoRoot = join(__dirname, '../../../..');
const MAIN_TIP = 1786500000000;
const PORT_NAMES = [
  'AddScheduledMessages1786600000000',
  'AddBotConfigsAndAutomationMatch1786700000000',
  'AddWebhookDeliveriesAndMediaObjects1786800000000',
  'AddSchedulerRecurrenceAndStickerPack1786900000000',
];

const tableNames = async (ds: DataSource): Promise<Set<string>> => {
  const rows: Array<{ name: string }> = await ds.query(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
  );
  return new Set(rows.map(r => r.name));
};

describe('WA-AKG port SQLite migrations: upgrade from main + down', () => {
  const file = join(tmpdir(), `openwa-port-mig-${process.pid}.sqlite`);

  afterAll(() => {
    rmSync(file, { force: true });
    rmSync(`${file}-wal`, { force: true });
    rmSync(`${file}-shm`, { force: true });
  });

  it('runs 178660-178690 after 178650, then reverts them', async () => {
    rmSync(file, { force: true });
    const all = importMigrations(join(repoRoot, 'src/database/migrations'));
    const mainOnly = all.filter(m => m.ts <= MAIN_TIP).map(m => m.Ctor);
    const full = all.map(m => m.Ctor);

    const boot = (migrations: unknown[]) =>
      new DataSource({
        type: 'better-sqlite3',
        database: file,
        migrations: migrations as never,
      });

    let ds = boot(mainOnly);
    await ds.initialize();
    await ds.runMigrations({ transaction: 'all' });
    let names = await tableNames(ds);
    expect(names.has('sessions')).toBe(true);
    expect(names.has('scheduled_messages')).toBe(false);
    expect(names.has('bot_configs')).toBe(false);
    expect(names.has('webhook_deliveries')).toBe(false);
    expect(names.has('media_objects')).toBe(false);
    await ds.destroy();

    ds = boot(full);
    await ds.initialize();
    const ran = await ds.runMigrations({ transaction: 'all' });
    expect(ran.map(m => m.name)).toEqual(PORT_NAMES);
    names = await tableNames(ds);
    expect(names.has('scheduled_messages')).toBe(true);
    expect(names.has('bot_configs')).toBe(true);
    expect(names.has('webhook_deliveries')).toBe(true);
    expect(names.has('media_objects')).toBe(true);

    await ds.undoLastMigration({ transaction: 'all' });
    await ds.undoLastMigration({ transaction: 'all' });
    await ds.undoLastMigration({ transaction: 'all' });
    await ds.undoLastMigration({ transaction: 'all' });
    names = await tableNames(ds);
    expect(names.has('scheduled_messages')).toBe(false);
    expect(names.has('bot_configs')).toBe(false);
    expect(names.has('webhook_deliveries')).toBe(false);
    expect(names.has('media_objects')).toBe(false);

    const reran = await ds.runMigrations({ transaction: 'all' });
    expect(reran.map(m => m.name)).toEqual(PORT_NAMES);
    await ds.destroy();
  }, 120_000);
});
