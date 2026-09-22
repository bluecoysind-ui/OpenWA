import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response for GET /api/whatsapp/link-code — the phone-number (pairing-code) twin of
 * LinkQrResponseDto.
 *
 * Same envelope as the QR flow so the Bluecoys frontend can treat both identically (poll
 * until `linked` flips to true). The only difference is the credential the user acts on:
 * an 8-character pairing code typed into WhatsApp instead of a QR image scanned by it.
 */
export class LinkCodeResponseDto {
  @ApiProperty({ description: 'OpenWA session id for this Bluecoys user' })
  sessionId!: string;

  @ApiProperty({
    description: 'True once WhatsApp is linked; no pairing code is returned then',
    example: false,
  })
  linked!: boolean;

  @ApiPropertyOptional({ description: 'Linked WhatsApp number (digits), when linked=true' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Bluecoys username from the request' })
  username?: string;

  @ApiPropertyOptional({
    description:
      '8-character code to enter in WhatsApp > Linked Devices > Link a Device > ' +
      '"Link with phone number instead" (when linked=false). Stable across polls until it expires.',
    example: 'ABCD1234',
  })
  pairingCode?: string;

  @ApiPropertyOptional({
    description: 'Unix epoch milliseconds after which the pairing code should be treated as stale (when linked=false)',
  })
  codeExpiresAt?: number;
}
