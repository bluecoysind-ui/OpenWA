/**
 * Bluecoys integration constants — HARDCODED on purpose (no env vars).
 *
 * This OpenWA instance exists to serve the Bluecoys WhatsApp login-reward flow, so its partner
 * endpoints are fixed. This file is the ONE place to change them (e.g. to point at a staging host):
 * nothing below is read from process.env or ConfigService.
 */

/** Bluecoys app origin the reward callbacks are sent to. No trailing slash. */
export const BLUECOYS_BASE_URL = 'https://bluecoys.com';

/**
 * Fired once a WhatsApp account links (POST, body { phone_number, username }) — Bluecoys credits
 * the reward to the user identified by `username`.
 */
export const BLUECOYS_LINKED_CALLBACK_URL = `${BLUECOYS_BASE_URL}/api/whatsapp-linked`;

/** Fired on a terminal disconnect (GET ?phone_number=) — Bluecoys reverses the reward. */
export const BLUECOYS_DISCONNECTED_CALLBACK_URL = `${BLUECOYS_BASE_URL}/api/whatsapp-disconnected`;

/** Outbound callback HTTP timeout. */
export const BLUECOYS_CALLBACK_TIMEOUT_MS = 15_000;

/** Expiry hint returned with each QR (WhatsApp rotates QR codes roughly every 20s). */
export const BLUECOYS_QR_TTL_MS = 20_000;

/**
 * Optional shared secret for the link routes. Empty = no gate: the routes are public, which is
 * fine because the Bluecoys frontend only reaches them through its own server-side proxy. Set a
 * value here to require `?token=<value>` on every link-qr / link-code call.
 */
export const BLUECOYS_LINK_TOKEN = '';
