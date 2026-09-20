import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduledCreateBody, clampCheckNumbers, mapForwardMany, parseNumberList } from './akg-builders.ts';

describe('buildScheduledCreateBody', () => {
  it('converts local datetime + IANA tz to an offset instant', () => {
    const body = buildScheduledCreateBody({
      chatId: '628123@c.us',
      localDateTime: '2026-09-21T15:00',
      timeZone: 'Asia/Kolkata',
      text: 'hello',
    });
    assert.equal(body.sendAt, '2026-09-21T15:00:00+05:30');
    assert.equal(body.timezone, 'Asia/Kolkata');
    assert.equal(body.text, 'hello');
    assert.equal(body.mediaUrl, undefined);
  });
});

describe('clampCheckNumbers', () => {
  it('dedupes and caps at 50', () => {
    const nums = Array.from({ length: 60 }, (_, i) => `62${i}`);
    nums.push('620');
    const clamped = clampCheckNumbers(nums);
    assert.equal(clamped.length, 50);
    assert.equal(clamped[0], '620');
  });
});

describe('mapForwardMany', () => {
  it('counts sent vs failed for 201/207/502 UIs', () => {
    const mapped = mapForwardMany(207, [
      { chatId: 'a', status: 'sent' },
      { chatId: 'b', status: 'failed', error: '501' },
    ]);
    assert.equal(mapped.httpStatus, 207);
    assert.equal(mapped.sent, 1);
    assert.equal(mapped.failed, 1);
  });
});

describe('parseNumberList', () => {
  it('splits lines and commas', () => {
    assert.deepEqual(parseNumberList('6281\n6282, 6283'), ['6281', '6282', '6283']);
  });
});
