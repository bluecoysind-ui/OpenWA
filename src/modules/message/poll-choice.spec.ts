import { BadRequestException } from '@nestjs/common';
import { resolvePollChoice } from './poll-choice';

describe('resolvePollChoice', () => {
  const options = ['Park', 'Beach', 'Downtown'];

  it('defaults to single choice when both fields are omitted', () => {
    expect(resolvePollChoice({ options })).toEqual({ allowMultipleAnswers: false, selectableCount: 1 });
  });

  it('maps allowMultipleAnswers true to selectableCount 0 (unlimited)', () => {
    expect(resolvePollChoice({ options, allowMultipleAnswers: true })).toEqual({
      allowMultipleAnswers: true,
      selectableCount: 0,
    });
  });

  it('treats selectableCount 1 as single choice', () => {
    expect(resolvePollChoice({ options, selectableCount: 1 })).toEqual({
      allowMultipleAnswers: false,
      selectableCount: 1,
    });
  });

  it('treats selectableCount > 1 as multiple', () => {
    expect(resolvePollChoice({ options, selectableCount: 2 })).toEqual({
      allowMultipleAnswers: true,
      selectableCount: 2,
    });
  });

  it('treats selectableCount 0 as unlimited on Baileys and as multiple on whatsapp-web.js', () => {
    // Baileys: selectableCount 0 = no cap. wwjs: count !== 1 → allowMultipleAnswers true. Same resolved shape.
    expect(resolvePollChoice({ options, selectableCount: 0 })).toEqual({
      allowMultipleAnswers: true,
      selectableCount: 0,
    });
  });

  it('accepts agreeing selectableCount and allowMultipleAnswers', () => {
    expect(resolvePollChoice({ options, selectableCount: 2, allowMultipleAnswers: true })).toEqual({
      allowMultipleAnswers: true,
      selectableCount: 2,
    });
    expect(resolvePollChoice({ options, selectableCount: 1, allowMultipleAnswers: false })).toEqual({
      allowMultipleAnswers: false,
      selectableCount: 1,
    });
  });

  it('treats selectableCount 3 with the flag omitted as multiple', () => {
    expect(resolvePollChoice({ options: ['A', 'B', 'C', 'D'], selectableCount: 3 })).toEqual({
      allowMultipleAnswers: true,
      selectableCount: 3,
    });
  });

  it('throws 400 when selectableCount 1 is paired with allowMultipleAnswers true', () => {
    expect(() => resolvePollChoice({ options, selectableCount: 1, allowMultipleAnswers: true })).toThrow(
      BadRequestException,
    );
  });

  it('throws 400 when selectableCount 3 is paired with allowMultipleAnswers false', () => {
    expect(() =>
      resolvePollChoice({ options: ['A', 'B', 'C', 'D'], selectableCount: 3, allowMultipleAnswers: false }),
    ).toThrow(BadRequestException);
  });

  it('throws 400 when selectableCount conflicts with allowMultipleAnswers', () => {
    expect(() => resolvePollChoice({ options, selectableCount: 1, allowMultipleAnswers: true })).toThrow(
      BadRequestException,
    );
    expect(() => resolvePollChoice({ options, selectableCount: 2, allowMultipleAnswers: false })).toThrow(
      BadRequestException,
    );
    expect(() => resolvePollChoice({ options, selectableCount: 0, allowMultipleAnswers: false })).toThrow(
      BadRequestException,
    );
  });

  it('throws 400 when selectableCount exceeds the option count', () => {
    expect(() => resolvePollChoice({ options, selectableCount: 4 })).toThrow(BadRequestException);
  });
});
