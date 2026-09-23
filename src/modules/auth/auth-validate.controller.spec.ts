import { AuthValidateController } from './auth-validate.controller';
import { ApiKey, ApiKeyRole } from './entities/api-key.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { AuthService } from './auth.service';
import type { Request } from 'express';

describe('AuthValidateController', () => {
  const auth = { getLiveBootstrapKey: jest.fn() } as unknown as AuthService;
  const controller = new AuthValidateController(auth);

  const makeKey = (over: Partial<ApiKey> = {}): ApiKey =>
    ({ id: 'k1', role: ApiKeyRole.OPERATOR, isActive: true, allowedIps: null, ...over }) as ApiKey;

  const req = (over: { site?: string; ip?: string } = {}): Request =>
    ({
      headers: over.site ? { 'sec-fetch-site': over.site } : {},
      ip: over.ip ?? '127.0.0.1',
      socket: { remoteAddress: over.ip ?? '127.0.0.1' },
    }) as Request;

  it('reports the guard-validated key as valid, echoing its role', () => {
    expect(controller.validate(makeKey({ role: ApiKeyRole.ADMIN }))).toEqual({
      valid: true,
      role: ApiKeyRole.ADMIN,
    });
  });

  it('returns valid:true for an IP-restricted key (no IP-less re-validation false negative)', () => {
    // The global guard already validated this key against the real client IP and attached it.
    // The handler must NOT re-validate without an IP, which previously fail-closed and wrongly
    // reported valid:false for any key carrying an allowedIps restriction.
    const key = makeKey({ allowedIps: ['10.0.0.0/24'] });
    expect(controller.validate(key)).toEqual({ valid: true, role: key.role });
  });

  it('returns valid:false when no key is attached (defense-in-depth)', () => {
    expect(controller.validate(undefined)).toEqual({ valid: false });
  });

  describe('ui-connect', () => {
    const prevEnv = { node: process.env.NODE_ENV, flag: process.env.UI_AUTO_CONNECT };

    afterEach(() => {
      process.env.NODE_ENV = prevEnv.node;
      if (prevEnv.flag === undefined) delete process.env.UI_AUTO_CONNECT;
      else process.env.UI_AUTO_CONNECT = prevEnv.flag;
      jest.mocked(auth.getLiveBootstrapKey).mockReset();
    });

    it('returns the live bootstrap key for a same-origin UI fetch', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.UI_AUTO_CONNECT;
      jest.mocked(auth.getLiveBootstrapKey).mockResolvedValue('owa_k1_local');
      await expect(controller.uiConnect(req({ site: 'same-origin', ip: '8.8.8.8' }))).resolves.toEqual({
        apiKey: 'owa_k1_local',
      });
    });

    it('404s when auto-connect is off', async () => {
      process.env.UI_AUTO_CONNECT = 'false';
      await expect(controller.uiConnect(req({ site: 'same-origin' }))).rejects.toBeInstanceOf(NotFoundException);
    });

    it('403s a cross-site fetch', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.UI_AUTO_CONNECT;
      await expect(controller.uiConnect(req({ site: 'cross-site', ip: '127.0.0.1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
