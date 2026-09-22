import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/auth.decorators';
import { LinkQrQueryDto } from './dto/link-qr-query.dto';
import { LinkQrResponseDto } from './dto/link-qr-response.dto';
import { LinkCodeResponseDto } from './dto/link-code-response.dto';
import { BluecoysLinkService } from './bluecoys-link.service';

/**
 * Bluecoys partner-linking API.
 *
 * Purpose: let a Bluecoys app user link their WhatsApp account to OpenWA so Bluecoys can pay the
 * "WhatsApp login reward". Two login methods are offered, both producing the same outcome:
 *
 *   GET /api/whatsapp/link-qr    → QR image the user scans in WhatsApp
 *   GET /api/whatsapp/link-code  → 8-char pairing code the user types into WhatsApp
 *
 * On a successful link the session:ready hook (bluecoys-hooks.service.ts) POSTs
 * https://bluecoys.com/api/whatsapp-linked so Bluecoys credits the reward; a terminal disconnect
 * GETs /api/whatsapp-disconnected so it can reverse it (URLs live in bluecoys.constants.ts — the
 * one place to change them; nothing is read from env). Both hooks are
 * login-method-agnostic — they key off the session's stored Bluecoys binding, not on how it was
 * paired — so any new login method added here gets the callbacks for free.
 *
 * Every route is @Public(): the Bluecoys frontend reaches these through its own server-side proxy
 * (/api/whatsapp-gateway/*), so the caller never holds an OpenWA API key. The optional shared
 * secret BLUECOYS_LINK_TOKEN in bluecoys.constants.ts (?token=) is the gate instead — see
 * assertLinkToken(). The integration is ALWAYS ON; there is no enable flag.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW BLUECOYS ENDPOINT
 *   1. Business logic → add a method to BluecoysLinkService (reuse prepareSession() if the route
 *      needs the per-user session; it handles create/resume/conflict/start in one place).
 *   2. Response shape → add a DTO under ./dto (and a query/body DTO if the route takes input;
 *      LinkQrQueryDto already covers the common `username` + `phone_number` pair).
 *   3. Handler → add a method below with @Get()/@Post() plus @ApiOperation/@ApiQuery/@ApiResponse
 *      so it shows up in Swagger (http://localhost:2785/api/docs).
 *   4. Auth → keep the class-level @Public() unless the route must require an OpenWA API key;
 *      call this.link.assertLinkToken(token) first to honour BLUECOYS_LINK_TOKEN.
 *   5. URL → routes here live under the global 'api' prefix + this controller's 'whatsapp' base,
 *      e.g. @Get('link-code') below is reachable at  GET /api/whatsapp/link-code .
 *   6. Config → there is none to wire: every URL/tunable is a constant in bluecoys.constants.ts.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */
@ApiTags('whatsapp')
@Controller('whatsapp')
@Public()
export class BluecoysController {
  constructor(private readonly link: BluecoysLinkService) {}

  /**
   * QR login. Starts (or resumes) the user's session and returns a QR to scan. Poll this route:
   * each call returns a fresh QR (they rotate ~20s) until `linked` becomes true.
   */
  @Get('link-qr')
  @ApiOperation({
    summary: 'Start (or resume) linking and return a WhatsApp QR for Bluecoys',
    description:
      'Query: username (your user id) and phone_number (digits, international). ' +
      'Returns base64 PNG data and when the QR expires. On successful link, OpenWA POSTs to Bluecoys.',
  })
  @ApiQuery({ name: 'username', required: true })
  @ApiQuery({ name: 'phone_number', required: true })
  @ApiQuery({ name: 'token', required: false, description: 'Required only when BLUECOYS_LINK_TOKEN is set in code' })
  @ApiResponse({ status: 200, type: LinkQrResponseDto })
  @ApiResponse({ status: 409, description: 'Session already bound to another phone or username' })
  async linkQr(@Query() query: LinkQrQueryDto, @Query('token') token?: string): Promise<LinkQrResponseDto> {
    this.link.assertLinkToken(token);
    return this.link.getLinkQr(query.username, query.phone_number);
  }

  /**
   * Phone-number login (pairing code) — the alternative to scanning a QR. Starts (or resumes) the
   * user's session and returns an 8-char code to type into WhatsApp. Poll this route: the SAME code
   * is returned on every call until it expires (so the user isn't chasing a moving target), and
   * `linked` flips to true once WhatsApp accepts it.
   */
  @Get('link-code')
  @ApiOperation({
    summary: 'Start (or resume) linking and return an 8-char phone pairing code for Bluecoys',
    description:
      'Phone-number alternative to link-qr. Query: username and phone_number (digits, international — ' +
      'this MUST be the WhatsApp number being linked). Returns an 8-character code to enter in ' +
      'WhatsApp > Linked Devices > Link a Device > "Link with phone number instead". ' +
      'Poll until linked=true; the same code is returned across polls until it expires. ' +
      'On successful link, OpenWA POSTs to Bluecoys exactly like the QR flow.',
  })
  @ApiQuery({ name: 'username', required: true })
  @ApiQuery({ name: 'phone_number', required: true })
  @ApiQuery({ name: 'token', required: false, description: 'Required only when BLUECOYS_LINK_TOKEN is set in code' })
  @ApiResponse({ status: 200, type: LinkCodeResponseDto })
  @ApiResponse({ status: 409, description: 'Session already bound to another phone or username' })
  @ApiResponse({ status: 504, description: 'Engine not ready to issue a code yet — retry in a few seconds' })
  async linkCode(@Query() query: LinkQrQueryDto, @Query('token') token?: string): Promise<LinkCodeResponseDto> {
    this.link.assertLinkToken(token);
    return this.link.getLinkCode(query.username, query.phone_number);
  }
}
