import { WebhookDeliveryLogService } from './webhook-delivery-log.service';

describe('WebhookDeliveryLogService', () => {
  const repo = {
    create: jest.fn((row: unknown) => row),
    save: jest.fn((row: unknown) => Promise.resolve(row)),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => ({
      delete: () => ({ where: () => ({ execute: () => Promise.resolve(undefined) }) }),
    })),
    remove: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 2 }),
  };

  const svc = new WebhookDeliveryLogService(repo as never);

  it('lists newest-first attempts for the webhook+session pair', async () => {
    repo.find.mockResolvedValueOnce([{ id: 'a', status: 'success' }]);
    await expect(svc.list('wh-1', 'sess-1')).resolves.toEqual([{ id: 'a', status: 'success' }]);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { webhookId: 'wh-1', sessionId: 'sess-1' } }),
    );
  });

  it('sweep deletes rows older than 30 days', async () => {
    await expect(svc.sweep()).resolves.toBe(2);
    expect(repo.delete).toHaveBeenCalled();
  });
});
