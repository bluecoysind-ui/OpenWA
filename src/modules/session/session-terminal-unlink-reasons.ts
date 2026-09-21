/**
 * Disconnect reasons that mean WhatsApp revoked this device (not a transient drop).
 * Shared by session lifecycle auditing and partner callbacks (e.g. Bluecoys).
 */
export const TERMINAL_UNLINK_REASONS = new Set(['LOGOUT', 'UNPAIRED', 'UNPAIRED_IDLE', 'logged out']);

export function isTerminalUnlinkReason(reason: string): boolean {
  return TERMINAL_UNLINK_REASONS.has(reason);
}
