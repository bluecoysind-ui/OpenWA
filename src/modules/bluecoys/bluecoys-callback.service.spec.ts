import { BluecoysCallbackService } from './bluecoys-callback.service';

describe('BluecoysCallbackService', () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true });
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = fetchMock as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    fetchMock.mockClear();
  });

  it('POSTs linked callback with phone and username', async () => {
    const svc = new BluecoysCallbackService();
    await svc.notifyLinked('919608079512', 'jane');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bluecoys.com/api/whatsapp-linked?phone_number=919608079512',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phone_number: '919608079512', username: 'jane' }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('GETs disconnected callback', async () => {
    const svc = new BluecoysCallbackService();
    await svc.notifyDisconnected('919608079512');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bluecoys.com/api/whatsapp-disconnected?phone_number=919608079512',
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) }),
    );
  });
});
