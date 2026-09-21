import { isTerminalUnlinkReason } from './session-terminal-unlink-reasons';

describe('isTerminalUnlinkReason', () => {
  it('recognises WhatsApp unlink reasons', () => {
    expect(isTerminalUnlinkReason('logged out')).toBe(true);
    expect(isTerminalUnlinkReason('LOGOUT')).toBe(true);
  });

  it('ignores transient drops', () => {
    expect(isTerminalUnlinkReason('TIMEOUT')).toBe(false);
  });
});
