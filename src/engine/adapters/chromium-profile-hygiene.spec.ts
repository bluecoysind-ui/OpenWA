import { isOrphanChromiumCommand } from './chromium-profile-hygiene';

describe('isOrphanChromiumCommand', () => {
  const id = '4bad68ea-3c56-405c-b52a-61ae604bbed3';

  it('matches the puppeteer session marker', () => {
    expect(isOrphanChromiumCommand(`/usr/bin/chromium --headless --openwa-session=${id}`, id)).toBe(true);
  });

  it('matches a Windows user-data-dir holding this session profile', () => {
    expect(
      isOrphanChromiumCommand(
        String.raw`C:\chrome.exe --headless --user-data-dir=D:\OpenWA\data\sessions\session-${id}`,
        id,
      ),
    ).toBe(true);
  });

  it('does not match a sibling session that shares a prefix', () => {
    expect(isOrphanChromiumCommand(`/usr/bin/chromium --openwa-session=${id}-2`, id)).toBe(false);
    expect(
      isOrphanChromiumCommand(`/usr/bin/chromium --user-data-dir=/data/sessions/session-${id}extra`, id),
    ).toBe(false);
  });

  it('does not match a non-browser process that merely carries the marker', () => {
    expect(isOrphanChromiumCommand(`/bin/grep --openwa-session=${id}`, id)).toBe(false);
  });
});
