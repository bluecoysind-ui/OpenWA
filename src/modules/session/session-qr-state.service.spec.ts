import { SessionQrStateService, SESSION_PAIRING_CODE_TTL_MS, SESSION_QR_TTL_MS } from './session-qr-state.service';

describe('SessionQrStateService', () => {
  let svc: SessionQrStateService;

  beforeEach(() => {
    svc = new SessionQrStateService();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps qr expiry stable while the payload is unchanged', () => {
    const first = svc.touchQr('s1', 'qr-a');
    expect(first).toBe(1_000_000 + SESSION_QR_TTL_MS);

    jest.spyOn(Date, 'now').mockReturnValue(1_000_500);
    const second = svc.touchQr('s1', 'qr-a');
    expect(second).toBe(first);
  });

  it('extends qr expiry when WhatsApp rotates the payload', () => {
    svc.touchQr('s1', 'qr-a');
    jest.spyOn(Date, 'now').mockReturnValue(1_010_000);
    const rotated = svc.touchQr('s1', 'qr-b');
    expect(rotated).toBe(1_010_000 + SESSION_QR_TTL_MS);
  });

  it('drops pairing when the qr rotates', () => {
    svc.setPairing('s1', 'ABCD1234', '628111');
    svc.touchQr('s1', 'qr-new');
    expect(svc.getPairing('s1')).toBeNull();
  });

  it('returns pairing expiry for three minutes', () => {
    const at = svc.setPairing('s1', 'ABCD1234', '628111');
    expect(at).toBe(1_000_000 + SESSION_PAIRING_CODE_TTL_MS);
    expect(svc.getPairing('s1')).toEqual({
      pairingCode: 'ABCD1234',
      pairingPhone: '628111',
      pairingExpiresAt: at,
    });
  });
});
