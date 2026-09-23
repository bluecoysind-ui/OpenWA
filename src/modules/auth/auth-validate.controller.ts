import { Controller, Post, Get, HttpCode, HttpStatus, NotFoundException, ForbiddenException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentApiKey, Public } from './decorators/auth.decorators';
import { ApiKey } from './entities/api-key.entity';
import { ValidateApiKeyResponseDto } from './dto';
import { AuthService } from './auth.service';
import { isUiAutoConnectEnabled, isUiConnectFetchAllowed } from '../../config/bootstrap-security';

@ApiTags('auth')
@Controller('auth')
export class AuthValidateController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate an API key' })
  @ApiHeader({ name: 'X-API-Key', description: 'API key to validate' })
  @ApiResponse({ status: 200, description: 'API key is valid', type: ValidateApiKeyResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  validate(@CurrentApiKey() apiKey?: ApiKey): { valid: boolean; role?: string } {
    // This route is behind the global API-key guard, so only a validated key reaches this handler
    // (a missing/invalid key 401s first). The guard has already verified the key — including its
    // client-IP and session-scope restrictions — and attached it to the request. Re-validating here
    // would repeat that work without the client IP, double-counting usage and, for an IP-restricted
    // key, failing closed (no IP) and wrongly reporting valid:false. So we trust the guard's result.
    // The valid:false branch is unreachable in normal operation; it's retained as defense-in-depth in
    // case the guard config ever changes, keeping the endpoint safe to expose directly.
    if (!apiKey) {
      return { valid: false };
    }
    return { valid: true, role: apiKey.role };
  }

  @Public()
  @Get('ui-connect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hand the local bootstrap API key to the same-origin UI so it can connect without a paste form',
  })
  @ApiResponse({ status: 200, description: 'Bootstrap key for the local UI' })
  @ApiResponse({ status: 403, description: 'Not a same-origin UI request' })
  @ApiResponse({ status: 404, description: 'Auto-connect is off, or no live bootstrap key' })
  async uiConnect(@Req() req: Request): Promise<{ apiKey: string }> {
    if (!isUiAutoConnectEnabled(process.env.UI_AUTO_CONNECT, process.env.NODE_ENV)) {
      throw new NotFoundException();
    }
    const site = typeof req.headers['sec-fetch-site'] === 'string' ? req.headers['sec-fetch-site'] : undefined;
    const ip = (req as Request & { clientIp?: string }).clientIp ?? req.ip ?? req.socket.remoteAddress;
    if (!isUiConnectFetchAllowed(site, ip)) {
      throw new ForbiddenException();
    }
    const apiKey = await this.authService.getLiveBootstrapKey();
    if (!apiKey) throw new NotFoundException();
    return { apiKey };
  }
}
