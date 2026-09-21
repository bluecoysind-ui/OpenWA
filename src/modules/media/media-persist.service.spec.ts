import { NotFoundException } from '@nestjs/common';
import { MediaPersistService } from './media-persist.service';
import { isUniqueViolation } from '../../common/utils/db-errors';

jest.mock('../../common/utils/db-errors', () => ({
  isUniqueViolation: jest.fn().mockReturnValue(false),
}));

describe('MediaPersistService', () => {
  const storage = {
    putFile: jest.fn().mockResolvedValue(undefined),
    getFile: jest.fn().mockResolvedValue(Buffer.from('bytes')),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
  const config = { get: jest.fn((key: string, def?: unknown) => (key === 'features.mediaPersist' ? true : def)) };
  const repo = {
    create: jest.fn((row: unknown) => row),
    insert: jest.fn().mockResolvedValue({}),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    remove: jest.fn(),
  };

  const svc = () => new MediaPersistService(storage as never, config as never, repo as never);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, def?: unknown) => (key === 'features.mediaPersist' ? true : def));
    repo.findOne.mockResolvedValue(null);
  });

  it('skips persist when the flag is off', async () => {
    config.get.mockReturnValue(false);
    await svc().persistInbound('s1', { id: 'm1', media: { mimetype: 'image/jpeg', data: 'QQ==' } } as never);
    expect(storage.putFile).not.toHaveBeenCalled();
  });

  it('writes session-prefixed keys and indexes the object', async () => {
    await svc().persistInbound('s1', {
      id: 'm1',
      media: { mimetype: 'image/jpeg', data: Buffer.from('hi').toString('base64') },
    } as never);
    expect(storage.putFile).toHaveBeenCalledWith('sessions/s1/chat/m1', Buffer.from('hi'));
    expect(repo.insert).toHaveBeenCalled();
  });

  it('sets quoted.fileUrl only when that quoted message was already stored', async () => {
    const message = { quotedMessage: { id: 'q1', body: 'x', hasMedia: true } } as never;
    await svc().attachQuotedFileUrl('s1', message);
    expect((message as { quotedMessage: { fileUrl?: string } }).quotedMessage.fileUrl).toBeUndefined();

    repo.findOne.mockResolvedValue({ storageKey: 'sessions/s1/chat/q1' });
    await svc().attachQuotedFileUrl('s1', message);
    expect((message as { quotedMessage: { fileUrl?: string } }).quotedMessage.fileUrl).toBe(
      '/api/sessions/s1/media/files/q1',
    );
  });

  it('404s list/get/delete when the flag is off', async () => {
    config.get.mockReturnValue(false);
    await expect(svc().list('s1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc().get('s1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc().remove('s1', 'm1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects path-like message ids', async () => {
    await expect(svc().get('s1', '../etc/passwd')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc().get('s1', 'a/b')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('swallows a unique index collision on persist', async () => {
    repo.insert.mockRejectedValueOnce(new Error('UNIQUE'));
    (isUniqueViolation as jest.Mock).mockReturnValueOnce(true);
    await expect(
      svc().persistInbound('s1', { id: 'm1', media: { mimetype: 'image/jpeg', data: 'QQ==' } } as never),
    ).resolves.toBeUndefined();
  });
});
