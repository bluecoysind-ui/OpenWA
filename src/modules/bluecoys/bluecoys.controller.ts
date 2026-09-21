import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/auth.decorators';
import { LinkQrQueryDto } from './dto/link-qr-query.dto';
import { LinkQrResponseDto } from './dto/link-qr-response.dto';
import { BluecoysLinkService } from './bluecoys-link.service';

@ApiTags('whatsapp')
@Controller('whatsapp')
@Public()
export class BluecoysController {
  constructor(private readonly link: BluecoysLinkService) {}

  @Get('link-qr')
  @ApiOperation({
    summary: 'Start (or resume) linking and return a WhatsApp QR for Bluecoys',
    description:
      'Query: username (your user id) and phone_number (digits, international). ' +
      'Returns base64 PNG data and when the QR expires. On successful link, OpenWA POSTs to Bluecoys.',
  })
  @ApiQuery({ name: 'username', required: true })
  @ApiQuery({ name: 'phone_number', required: true })
  @ApiQuery({ name: 'token', required: false, description: 'Required when BLUECOYS_LINK_TOKEN is set' })
  @ApiResponse({ status: 200, type: LinkQrResponseDto })
  @ApiResponse({ status: 503, description: 'Integration disabled (BLUECOYS_INTEGRATION_ENABLED not true)' })
  @ApiResponse({ status: 409, description: 'Session already bound to another phone or username' })
  async linkQr(@Query() query: LinkQrQueryDto, @Query('token') token?: string): Promise<LinkQrResponseDto> {
    this.link.assertLinkToken(token);
    return this.link.getLinkQr(query.username, query.phone_number);
  }
}
