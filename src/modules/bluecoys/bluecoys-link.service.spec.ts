import { ConfigService } from '@nestjs/config';
import { SessionStatus } from '../session/entities/session.entity';
import { BluecoysLinkService } from './bluecoys-link.service';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';

describe('BluecoysLinkService', () => {
  const config = {
    get: (key: string) => {
      if (key === 'bluecoys.enabled') return true;
      if (key === 'bluecoys.qrTtlMs') return 20_000;
      if (key === 'bluecoys.linkToken') return '';
      return undefined;
    },
  } as ConfigService;

  it('returns linked=true when session is already READY with matching phone', async () => {
    const sessions = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 's1',
          name: 'bc-jane',
          status: SessionStatus.READY,
          phone: '919608079512@c.us',
          config: { bluecoysUsername: 'jane', bluecoysPhone: '919608079512' },
        },
      ]),
      create: jest.fn(),
      findOne: jest.fn(),
      isActive: jest.fn(),
      start: jest.fn(),
      getQRCode: jest.fn(),
    };
    const repo = { update: jest.fn() };
    const qrState = new BluecoysQrStateService(config);
    const svc = new BluecoysLinkService(sessions as never, config, qrState, repo as never);

    const res = await svc.getLinkQr('jane', '919608079512');
    expect(res.linked).toBe(true);
    expect(res.phoneNumber).toBe('919608079512');
    expect(sessions.start).not.toHaveBeenCalled();
  });
});
