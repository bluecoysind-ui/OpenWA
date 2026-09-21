import { senderIsAllowed, BotAccessMode } from './bot-access';

describe('senderIsAllowed', () => {
  it('all mode allows anyone not on the block list', () => {
    expect(senderIsAllowed(BotAccessMode.ALL, [], [], '628111@c.us')).toBe(true);
    expect(senderIsAllowed(BotAccessMode.ALL, [], ['628111'], '628111@c.us')).toBe(false);
  });

  it('allow mode requires a list hit and still honours the block list', () => {
    expect(senderIsAllowed(BotAccessMode.ALLOW, ['628111@c.us'], [], '628111@c.us')).toBe(true);
    expect(senderIsAllowed(BotAccessMode.ALLOW, ['628111'], [], '628111:12@c.us')).toBe(true);
    expect(senderIsAllowed(BotAccessMode.ALLOW, ['628999'], [], '628111@c.us')).toBe(false);
    expect(senderIsAllowed(BotAccessMode.ALLOW, ['628111'], ['628111'], '628111@c.us')).toBe(false);
    expect(senderIsAllowed(BotAccessMode.ALLOW, [], [], '628111@c.us')).toBe(false);
  });

  it('block mode allows everyone except listed senders', () => {
    expect(senderIsAllowed(BotAccessMode.BLOCK, [], ['628111'], '628222@c.us')).toBe(true);
    expect(senderIsAllowed(BotAccessMode.BLOCK, [], ['628111@c.us'], '628111@c.us')).toBe(false);
  });

  it('missing sender is denied', () => {
    expect(senderIsAllowed(BotAccessMode.ALL, [], [], null)).toBe(false);
  });
});
