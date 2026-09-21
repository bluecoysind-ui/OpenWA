import { BadRequestException } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MUTE_DURATION_SEC_MAX, MuteChatDto, resolveMuteUntil } from './mute-chat.dto';

const errorsFor = (plain: object): number => validateSync(plainToInstance(MuteChatDto, plain)).length;

describe('MuteChatDto', () => {
  it('accepts muteUntil alone — the pre-existing client shape', () => {
    expect(errorsFor({ chatId: '628123@c.us', muteUntil: 1_800_000_000_000 })).toBe(0);
  });

  it('accepts muteUntil null (unmute)', () => {
    expect(errorsFor({ chatId: '628123@c.us', muteUntil: null })).toBe(0);
  });

  it('accepts durationSec alone', () => {
    expect(errorsFor({ chatId: '628123@c.us', durationSec: 3600 })).toBe(0);
  });

  it('rejects durationSec of 0 and over the 365-day cap', () => {
    expect(errorsFor({ chatId: '628123@c.us', durationSec: 0 })).toBeGreaterThan(0);
    expect(errorsFor({ chatId: '628123@c.us', durationSec: MUTE_DURATION_SEC_MAX + 1 })).toBeGreaterThan(0);
  });
});

describe('resolveMuteUntil', () => {
  it('passes muteUntil through, including null unmute', () => {
    expect(resolveMuteUntil({ chatId: '628123@c.us', muteUntil: 1_800_000_000_000 })).toBe(1_800_000_000_000);
    expect(resolveMuteUntil({ chatId: '628123@c.us', muteUntil: null })).toBeNull();
  });

  it('maps durationSec from now', () => {
    expect(resolveMuteUntil({ chatId: '628123@c.us', durationSec: 60 }, 1_700_000_000_000)).toBe(1_700_000_060_000);
  });

  it('rejects both fields and neither field', () => {
    expect(() => resolveMuteUntil({ chatId: '628123@c.us', durationSec: 60, muteUntil: 1_800_000_000_000 })).toThrow(
      BadRequestException,
    );
    expect(() => resolveMuteUntil({ chatId: '628123@c.us' })).toThrow(BadRequestException);
  });
});
