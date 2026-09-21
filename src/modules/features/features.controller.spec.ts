import { ConfigService } from '@nestjs/config';
import { FeaturesController } from './features.controller';

function config(over: Record<string, unknown> = {}): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => (key in over ? over[key] : fallback),
  } as ConfigService;
}

describe('FeaturesController', () => {
  const prev = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  });

  it('returns booleans only and never the remove.bg key', () => {
    const body = new FeaturesController(
      config({
        features: {
          scheduledMessages: true,
          botCommands: false,
          mediaPersist: true,
          autoReplyRegex: false,
          pollVoteEvents: true,
        },
        'removeBg.apiKey': 'super-secret-rmbg',
      }),
    ).get();

    expect(body).toEqual({
      scheduler: true,
      botCommands: false,
      mediaPersist: true,
      removeBgConfigured: true,
      regexRules: false,
      pollVoteEvents: true,
    });
    expect(JSON.stringify(body)).not.toContain('super-secret-rmbg');
    expect(Object.keys(body).sort()).toEqual(
      ['botCommands', 'mediaPersist', 'pollVoteEvents', 'regexRules', 'removeBgConfigured', 'scheduler'].sort(),
    );
  });

  it('treats a blank remove.bg key as not configured', () => {
    const body = new FeaturesController(config({ features: {}, 'removeBg.apiKey': '   ' })).get();
    expect(body.removeBgConfigured).toBe(false);
  });
});
