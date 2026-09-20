import { useEffect, useState } from 'react';
import {
  createAutomationRule,
  deleteAutomationRule,
  getBotConfig,
  listAutomationRules,
  putBotConfig,
  updateAutomationRule,
  type AutomationRule,
  type BotConfig,
} from '@/lib/openwa/akg-api';
import { useAppToast } from '@/lib/openwa/useToast';
import { Toggle } from '../settings/ui';
import {
  AkgBanner,
  Card,
  ConfirmBar,
  EmptyHint,
  SessionSelect,
  btn,
  danger,
  field,
  ghost,
  useAkgFeatures,
  useAkgSession,
  useCanWrite,
} from './akg-ui';

const MATCH = ['contains', 'equals', 'startsWith', 'regex'] as const;
const CTX = ['all', 'private', 'group'] as const;

export function AutomationPanel() {
  const toast = useAppToast();
  const flags = useAkgFeatures();
  const { sessions, sessionId, setSessionId } = useAkgSession();
  const canWrite = useCanWrite();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [bot, setBot] = useState<BotConfig | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState({
    name: '',
    replyText: '',
    replyMediaUrl: '',
    matchMode: 'contains',
    matchPattern: '',
    chatContext: 'all',
    cooldownSeconds: '60',
    enabled: true,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = () => {
    if (!sessionId) return;
    Promise.all([listAutomationRules(sessionId), getBotConfig(sessionId)])
      .then(([r, b]) => {
        setRules(r);
        setBot(b);
      })
      .catch(setError);
  };

  useEffect(() => {
    setError(null);
    reload();
  }, [sessionId]);

  const saveRule = async () => {
    setError(null);
    try {
      if (form.matchMode === 'regex' && !flags.data.regexRules) {
        toast.error('Regex matchMode needs AUTO_REPLY_REGEX=true');
        return;
      }
      await createAutomationRule(sessionId, {
        name: form.name,
        replyText: form.replyText,
        replyMediaUrl: form.replyMediaUrl || undefined,
        matchMode: form.matchMode,
        matchPattern: form.matchPattern || undefined,
        chatContext: form.chatContext,
        cooldownSeconds: Number(form.cooldownSeconds) || 60,
        enabled: form.enabled,
      });
      toast.success('Rule created');
      reload();
    } catch (err) {
      setError(err);
    }
  };

  const saveBot = async () => {
    if (!bot) return;
    setError(null);
    try {
      setBot(await putBotConfig(sessionId, bot));
      toast.success('Bot settings saved');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="space-y-3">
      <AkgBanner error={error ?? flags.error} />
      <SessionSelect value={sessionId} onChange={setSessionId} sessions={sessions.data ?? []} />
      <Card title="Auto-reply rule" sub="Access lists on bot settings are evaluated before these conditions.">
        <div className="grid gap-2">
          <input
            className={field}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Name"
          />
          <textarea
            className={field}
            value={form.replyText}
            onChange={e => setForm(f => ({ ...f, replyText: e.target.value }))}
            placeholder="Reply text"
          />
          <input
            className={field}
            value={form.replyMediaUrl}
            onChange={e => setForm(f => ({ ...f, replyMediaUrl: e.target.value }))}
            placeholder="Reply media URL (optional)"
          />
          <select
            className={field}
            value={form.matchMode}
            onChange={e => setForm(f => ({ ...f, matchMode: e.target.value }))}
          >
            {MATCH.map(m => (
              <option key={m} value={m} disabled={m === 'regex' && !flags.data.regexRules}>
                {m}
                {m === 'regex' && !flags.data.regexRules ? ' (flag off)' : ''}
              </option>
            ))}
          </select>
          <input
            className={field}
            value={form.matchPattern}
            onChange={e => setForm(f => ({ ...f, matchPattern: e.target.value }))}
            placeholder="Pattern"
          />
          <select
            className={field}
            value={form.chatContext}
            onChange={e => setForm(f => ({ ...f, chatContext: e.target.value }))}
          >
            {CTX.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={field}
            value={form.cooldownSeconds}
            onChange={e => setForm(f => ({ ...f, cooldownSeconds: e.target.value }))}
            placeholder="Cooldown seconds"
          />
          <label className="flex items-center gap-2 text-sm">
            <Toggle checked={form.enabled} onChange={enabled => setForm(f => ({ ...f, enabled }))} />
            Enabled
          </label>
          <button type="button" className={btn} disabled={!canWrite} onClick={() => void saveRule()}>
            Create rule
          </button>
        </div>
      </Card>
      <Card title="Rules" sub={rules.length ? `${rules.length} rule(s)` : 'None yet'}>
        {rules.length === 0 ? <EmptyHint>No auto-reply rules.</EmptyHint> : null}
        <ul className="space-y-2">
          {rules.map(rule => (
            <li key={rule.id} className="rounded-xl border border-line bg-night/30 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-medium">{rule.name}</div>
                  <div className="text-[11px] text-muted">
                    {rule.matchMode} {rule.chatContext} · cooldown {rule.cooldownSeconds}s ·{' '}
                    {rule.enabled ? 'on' : 'off'}
                  </div>
                  <div>{rule.replyText}</div>
                </div>
                {canWrite ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={ghost}
                      onClick={() =>
                        void updateAutomationRule(sessionId, rule.id, { enabled: !rule.enabled })
                          .then(reload)
                          .catch(setError)
                      }
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button type="button" className={danger} onClick={() => setDeleteId(rule.id)}>
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
              {deleteId === rule.id ? (
                <ConfirmBar
                  prompt="Delete this rule?"
                  onCancel={() => setDeleteId(null)}
                  onConfirm={() => {
                    void deleteAutomationRule(sessionId, rule.id)
                      .then(() => {
                        setDeleteId(null);
                        reload();
                      })
                      .catch(setError);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card
        title="Bot settings"
        sub={`Commands flag ${flags.data.botCommands ? 'on' : 'off'} globally. Welcome uses paced send on group.join.`}
      >
        {bot ? (
          <div className="grid gap-2">
            <select
              className={field}
              value={bot.accessMode}
              onChange={e => setBot({ ...bot, accessMode: e.target.value as BotConfig['accessMode'] })}
            >
              <option value="all">all</option>
              <option value="allow">allow list</option>
              <option value="block">block list</option>
            </select>
            <textarea
              className={field}
              value={bot.allowList.join('\n')}
              onChange={e =>
                setBot({
                  ...bot,
                  allowList: e.target.value
                    .split(/\n+/)
                    .map(s => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Allow list JIDs"
            />
            <textarea
              className={field}
              value={bot.blockList.join('\n')}
              onChange={e =>
                setBot({
                  ...bot,
                  blockList: e.target.value
                    .split(/\n+/)
                    .map(s => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Block list JIDs"
            />
            <input
              className={field}
              value={bot.prefix}
              onChange={e => setBot({ ...bot, prefix: e.target.value })}
              placeholder="Command prefix"
            />
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={bot.commandsEnabled} onChange={commandsEnabled => setBot({ ...bot, commandsEnabled })} />
              Commands on (also needs BOT_COMMANDS)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={bot.autoRead} onChange={autoRead => setBot({ ...bot, autoRead })} />
              Auto-read inbound chats
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Toggle checked={bot.alwaysOnline} onChange={alwaysOnline => setBot({ ...bot, alwaysOnline })} />
              Always online (applied on save)
            </label>
            <textarea
              className={field}
              value={bot.welcomeMessage ?? ''}
              onChange={e => setBot({ ...bot, welcomeMessage: e.target.value || null })}
              placeholder="Welcome message on group.join (empty disables)"
            />
            <input
              className={field}
              value={bot.stickerPackName ?? ''}
              onChange={e => setBot({ ...bot, stickerPackName: e.target.value || null })}
              placeholder="Sticker pack name (#sticker media)"
            />
            <input
              className={field}
              value={bot.stickerPackAuthor ?? ''}
              onChange={e => setBot({ ...bot, stickerPackAuthor: e.target.value || null })}
              placeholder="Sticker pack author"
            />
            <button type="button" className={btn} disabled={!canWrite} onClick={() => void saveBot()}>
              Save bot settings
            </button>
          </div>
        ) : (
          <EmptyHint>Loading bot config…</EmptyHint>
        )}
      </Card>
    </div>
  );
}
