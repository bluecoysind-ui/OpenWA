import { SessionStatus } from '../session/entities/session.entity';
import { BluecoysLinkService } from './bluecoys-link.service';
import { BluecoysQrStateService } from './bluecoys-qr-state.service';

describe('BluecoysLinkService', () => {
  /** A session already linked to jane's claimed number — the terminal "linked" case. */
  const linkedSession = {
    id: 's1',
    name: 'bc-jane',
    status: SessionStatus.READY,
    phone: '919608079512@c.us',
    config: { bluecoysUsername: 'jane', bluecoysPhone: '919608079512' },
  };

  /** A freshly created, not-yet-linked session — the case where a credential must be issued. */
  const pendingSession = {
    id: 's2',
    name: 'bc-jane',
    status: SessionStatus.INITIALIZING,
    phone: null,
    config: { bluecoysUsername: 'jane', bluecoysPhone: '919608079512' },
  };

  function makeSvc(sessions: Record<string, jest.Mock>) {
    const repo = { update: jest.fn() };
    const qrState = new BluecoysQrStateService();
    const svc = new BluecoysLinkService(sessions as never, qrState, repo as never);
    return { svc, qrState, repo };
  }

  // ── QR ──────────────────────────────────────────────────────────────────────────────────────

  it('link-qr: returns linked=true when session is already READY with matching phone', async () => {
    const sessions = {
      findAll: jest.fn().mockResolvedValue([linkedSession]),
      create: jest.fn(),
      findOne: jest.fn(),
      isActive: jest.fn(),
      start: jest.fn(),
      getQRCode: jest.fn(),
      requestPairingCode: jest.fn(),
    };
    const { svc } = makeSvc(sessions);

    const res = await svc.getLinkQr('jane', '919608079512');
    expect(res.linked).toBe(true);
    expect(res.phoneNumber).toBe('919608079512');
    expect(sessions.start).not.toHaveBeenCalled();
  });

  // ── Phone pairing code ──────────────────────────────────────────────────────────────────────

  it('link-code: returns linked=true when session is already READY with matching phone', async () => {
    const sessions = {
      findAll: jest.fn().mockResolvedValue([linkedSession]),
      create: jest.fn(),
      findOne: jest.fn(),
      isActive: jest.fn(),
      start: jest.fn(),
      getQRCode: jest.fn(),
      requestPairingCode: jest.fn(),
    };
    const { svc } = makeSvc(sessions);

    const res = await svc.getLinkCode('jane', '919608079512');
    expect(res.linked).toBe(true);
    expect(res.phoneNumber).toBe('919608079512');
    expect(res.pairingCode).toBeUndefined();
    expect(sessions.requestPairingCode).not.toHaveBeenCalled();
    expect(sessions.start).not.toHaveBeenCalled();
  });

  it('link-code: creates + starts the session and returns a pairing code when not linked', async () => {
    const sessions = {
      findAll: jest.fn().mockResolvedValue([]), // first time we see this user
      create: jest.fn().mockResolvedValue(pendingSession),
      findOne: jest.fn().mockResolvedValue(pendingSession),
      isActive: jest.fn().mockReturnValue(false),
      start: jest.fn().mockResolvedValue(pendingSession),
      getQRCode: jest.fn(),
      requestPairingCode: jest
        .fn()
        .mockResolvedValue({ pairingCode: 'ABCD1234', status: SessionStatus.INITIALIZING }),
    };
    const { svc } = makeSvc(sessions);

    const res = await svc.getLinkCode('jane', '919608079512');
    expect(res.linked).toBe(false);
    expect(res.sessionId).toBe('s2');
    expect(res.pairingCode).toBe('ABCD1234');
    expect(typeof res.codeExpiresAt).toBe('number');
    expect(sessions.create).toHaveBeenCalledWith({
      name: 'bc-jane',
      config: { bluecoysUsername: 'jane', bluecoysPhone: '919608079512' },
    });
    expect(sessions.start).toHaveBeenCalledWith('s2');
    // The engine is handed the digits-only international number it expects.
    expect(sessions.requestPairingCode).toHaveBeenCalledWith('s2', '919608079512');
  });

  it('link-code: returns the SAME cached code on a subsequent poll instead of minting a new one', async () => {
    const sessions = {
      findAll: jest.fn().mockResolvedValue([pendingSession]),
      create: jest.fn(),
      findOne: jest.fn().mockResolvedValue(pendingSession),
      isActive: jest.fn().mockReturnValue(true), // already running from the first poll
      start: jest.fn(),
      getQRCode: jest.fn(),
      requestPairingCode: jest
        .fn()
        .mockResolvedValueOnce({ pairingCode: 'FIRST111', status: SessionStatus.INITIALIZING })
        .mockResolvedValueOnce({ pairingCode: 'SECOND22', status: SessionStatus.INITIALIZING }),
    };
    const { svc } = makeSvc(sessions);

    const first = await svc.getLinkCode('jane', '919608079512');
    const second = await svc.getLinkCode('jane', '919608079512');
    expect(first.pairingCode).toBe('FIRST111');
    expect(second.pairingCode).toBe('FIRST111'); // stable — the user is still typing it
    expect(sessions.requestPairingCode).toHaveBeenCalledTimes(1);
    expect(sessions.start).not.toHaveBeenCalled();
  });
});
