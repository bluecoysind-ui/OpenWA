import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkQrResponseDto {
  @ApiProperty({ description: 'OpenWA session id for this Bluecoys user' })
  sessionId!: string;

  @ApiProperty({
    description: 'True when WhatsApp is already linked; no QR is returned',
    example: false,
  })
  linked!: boolean;

  @ApiPropertyOptional({ description: 'Linked WhatsApp number (digits), when linked=true' })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Bluecoys username from the request' })
  username?: string;

  @ApiPropertyOptional({ description: 'PNG bytes as base64 (no data: URL prefix), when linked=false' })
  qrCodeBase64?: string;

  @ApiPropertyOptional({
    description: 'Unix epoch milliseconds when this QR stops being valid (when linked=false)',
  })
  qrExpiresAt?: number;
}
