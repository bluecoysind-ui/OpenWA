import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { setTimeout as delay } from 'node:timers/promises';
import type { LoggerService } from '../../common/services/logger.service';
import { wwjsAuthDir } from '../auth-dir-paths';

/**
 * Chromium/profile hygiene run before a whatsapp-web.js browser launches.
 *
 * Neither of these is about WhatsApp. They clean up after the OPERATING SYSTEM and the container: a
 * process killed with SIGKILL leaves an orphaned browser and stale profile locks behind, and both
 * must be dealt with before the next launch. That is an independent audience — it changes when
 * Docker, Puppeteer or the host platform changes, never when the WhatsApp protocol does — so it lives
 * outside the adapter that implements the protocol.
 *
 * Both are best-effort by contract: they log at debug and never throw, so a hostile `ps` or an
 * unreadable profile dir can never block an engine start.
 */

/** Just enough of the logger to report; the adapter passes its own so spies keep observing it. */
type HygieneLogger = Pick<LoggerService, 'debug' | 'log'>;

const EXEC_OPTS = { maxBuffer: 8 * 1024 * 1024, windowsHide: true, timeout: 15_000 } as const;

function decodeExecOutput(stdout: string | Buffer): string {
  if (typeof stdout === 'string') {
    return stdout.includes('\u0000') ? Buffer.from(stdout, 'binary').toString('utf16le') : stdout;
  }
  if (stdout.includes(0)) return stdout.toString('utf16le').replace(/^\uFEFF/, '');
  return stdout.toString('utf8');
}

function execFileUtf8(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { ...EXEC_OPTS, encoding: 'buffer' }, (error, stdout) => {
      if (error) reject(error instanceof Error ? error : new Error(error.message));
      else resolve(decodeExecOutput(stdout));
    });
  });
}

function sessionMarkerRe(sessionId: string): RegExp {
  const marker = `--openwa-session=${sessionId}`;
  return new RegExp('(?:^|\\s)' + marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)');
}

function sessionProfileRe(sessionId: string): RegExp {
  const id = sessionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\\\/=\\s"])session-${id}(?:["'\\s]|$)`);
}

export function isOrphanChromiumCommand(args: string, sessionId: string): boolean {
  if (!/chrome|chromium|headless/i.test(args)) return false;
  return sessionMarkerRe(sessionId).test(args) || sessionProfileRe(sessionId).test(args);
}

function parseUnixPs(stdout: string): Array<{ pid: number; args: string }> {
  const rows: Array<{ pid: number; args: string }> = [];
  for (const line of stdout.split('\n')) {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!match) continue;
    rows.push({ pid: Number(match[1]), args: match[2] });
  }
  return rows;
}

function parseWmicList(stdout: string): Array<{ pid: number; args: string }> {
  const rows: Array<{ pid: number; args: string }> = [];
  let commandLine = '';
  let processId = '';
  const flush = (): void => {
    const pid = Number(processId);
    if (Number.isInteger(pid) && pid > 0) rows.push({ pid, args: commandLine });
    commandLine = '';
    processId = '';
  };
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).replace(/^\uFEFF/, '');
    const value = line.slice(eq + 1);
    if (/^CommandLine$/i.test(key)) commandLine = value;
    else if (/^ProcessId$/i.test(key)) processId = value;
  }
  flush();
  return rows;
}

async function listWindowsCommandLines(): Promise<Array<{ pid: number; args: string }>> {
  try {
    const stdout = await execFileUtf8('wmic', ['process', 'get', 'ProcessId,CommandLine', '/FORMAT:list']);
    const rows = parseWmicList(stdout);
    if (rows.length > 0) return rows;
  } catch {
    /* WMIC is missing on some Windows 11 installs — fall through to PowerShell. */
  }
  const stdout = await execFileUtf8('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'chrome|chromium' } | ForEach-Object { '{0} {1}' -f $_.ProcessId, $_.CommandLine }",
  ]);
  return parseUnixPs(stdout);
}

async function listProcessCommandLines(): Promise<Array<{ pid: number; args: string }>> {
  if (process.platform === 'win32') return listWindowsCommandLines();
  const stdout = await execFileUtf8('ps', ['-eo', 'pid=,args=']);
  return parseUnixPs(stdout);
}

async function killPid(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    await execFileUtf8('taskkill', ['/PID', String(pid), '/T', '/F']).catch(() => undefined);
    return;
  }
  process.kill(pid, 'SIGKILL');
}

/**
 * SIGKILL any Chromium orphaned by a previous lifetime of this process. When OpenWA dies hard
 * (kill -9, crash, host reboot, Windows `npm run dev` restart) Puppeteer's exit hook never runs, so
 * the browser survives as an orphan — leaking memory and pinning the session profile dir. Orphans
 * are identified by the `--openwa-session=<id>` marker arg appended to the puppeteer args at launch
 * (Chromium ignores the unknown flag; it is purely a process-table label) and by the LocalAuth
 * `session-<id>` user-data-dir. Best-effort: never throws — an enumeration failure only logs at
 * debug, so the sweep can never block an engine start.
 */
export async function killOrphanedChromiumProcesses(sessionId: string, logger: HygieneLogger): Promise<void> {
  try {
    const rows = await listProcessCommandLines();
    const killedPids: number[] = [];
    for (const { pid, args } of rows) {
      if (pid === process.pid || !isOrphanChromiumCommand(args, sessionId)) continue;
      try {
        await killPid(pid);
        killedPids.push(pid);
      } catch (error) {
        // ESRCH: the process exited between listing and the kill — nothing left to do.
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
          logger.debug(`Could not SIGKILL orphaned Chromium pid ${pid}`, { error: String(error) });
        }
      }
    }
    if (killedPids.length > 0) {
      logger.log(
        `Killed ${killedPids.length} orphaned Chromium process(es) left over from a previous process lifetime`,
        { sessionId, pids: killedPids },
      );
      // Windows keeps the userDataDir locked until the process tree actually exits.
      if (process.platform === 'win32') await delay(400);
    }
  } catch (error) {
    logger.debug('Could not enumerate processes for the orphaned Chromium sweep', { error: String(error) });
  }
}

/**
 * Remove Chromium's SingletonLock/SingletonSocket/SingletonCookie from the LocalAuth profile dir
 * (same dir clearLocalAuth removes) before the browser launches. A hard-killed Chromium
 * (SIGKILL/crash) leaves them behind, and on some setups (e.g. Docker PID reuse) the stale files
 * block the next launch unless they are cleared first. Best-effort: a removal
 * failure only logs at debug and never fails the start.
 */
export async function removeStaleSingletonFiles(
  sessionId: string,
  sessionDataPath: string,
  logger: HygieneLogger,
): Promise<void> {
  const profileDir = wwjsAuthDir(sessionDataPath, sessionId);
  for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    try {
      await fs.promises.rm(path.join(profileDir, name), { force: true });
    } catch (error) {
      logger.debug(`Could not remove stale ${name} from ${profileDir}`, { error: String(error) });
    }
  }
}
