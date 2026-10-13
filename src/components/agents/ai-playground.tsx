'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Bot,
  RotateCcw,
  Send,
  Loader2,
  UserCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Copy,
  Check,
  Building2,
  Calendar,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  /** assistant-only: the agent signalled a human handoff on this turn. */
  handoff?: boolean;
  latencyMs?: number;
}

interface AgentMeta {
  configured: boolean;
  provider?: string;
  model?: string;
  isActive?: boolean;
  autoReplyEnabled?: boolean;
  maxPerConversation?: number;
}

const QUICK_TEST_PROMPTS = [
  {
    icon: Building2,
    label: '3BHK Flat Inquiry',
    prompt:
      'Hi! Do you have any ready 3BHK luxury apartments available near Gulshan or Banani with car parking? Please share details and sizes.',
  },
  {
    icon: Calendar,
    label: 'Book Site Visit',
    prompt:
      'I would like to schedule an on-site visit to inspect your ongoing residential project this Saturday around 11:30 AM. Can you arrange that?',
  },
  {
    icon: HelpCircle,
    label: 'Payment Schedule',
    prompt:
      'What is the down payment percentage and monthly installment structure for your 2BHK and 3BHK apartments?',
  },
  {
    icon: AlertTriangle,
    label: 'Request Human Agent (Handoff)',
    prompt:
      'I am not satisfied with general details and want to speak directly with your senior sales director right now.',
  },
];

export function AiPlayground({ onGoToSetup }: { onGoToSetup?: () => void }) {
  const t = useTranslations('Agents.playground');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [agentMeta, setAgentMeta] = useState<AgentMeta | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, sending]);

  // Fetch active agent metadata to show the status chip
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ai/config');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data) {
          setAgentMeta({
            configured: Boolean(data.configured),
            provider: data.provider,
            model: data.model,
            isActive: Boolean(data.is_active),
            autoReplyEnabled: Boolean(data.auto_reply_enabled),
            maxPerConversation: data.auto_reply_max_per_conversation,
          });
        }
      } catch {
        // Silently keep meta null
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || sending) return;

    const next: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(next);
    if (!textToSend) setInput('');
    setSending(true);
    const startTime = performance.now();

    try {
      const res = await fetch('/api/ai/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send only role+content — the server ignores anything else.
        body: JSON.stringify({
          messages: next.map((turn) => ({ role: turn.role, content: turn.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        if (data.code === 'ai_not_configured') {
          toast.error(t('notConfigured'));
        } else {
          toast.error(data.error ?? t('noReply'));
        }
        // Roll the unsent user turn back so the transcript stays clean.
        setTurns(turns);
        setInput(text);
        return;
      }

      setTurns([
        ...next,
        {
          role: 'assistant',
          content:
            typeof data.reply === 'string' && data.reply.trim()
              ? data.reply
              : '',
          handoff: Boolean(data.handoff),
          latencyMs,
        },
      ]);
    } catch {
      toast.error(t('unreachable'));
      setTurns(turns);
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const copyTurn = (content: string, index: number) => {
    if (!content) return;
    void navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success('Reply copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const providerLabel =
    agentMeta?.provider === 'gemini'
      ? 'Google Gemini'
      : agentMeta?.provider === 'openai'
        ? 'OpenAI'
        : agentMeta?.provider === 'anthropic'
          ? 'Anthropic Claude'
          : agentMeta?.provider === 'openai_compatible'
            ? 'OpenAI-Compatible'
            : agentMeta?.provider;

  return (
    <div className="flex h-[68vh] min-h-[480px] flex-col rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{t('title')}</span>
              {agentMeta?.configured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      agentMeta.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500',
                    )}
                  />
                  <span>{providerLabel}</span>
                  {agentMeta.model && (
                    <span className="text-muted-foreground">· {agentMeta.model}</span>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agentMeta?.configured && agentMeta.autoReplyEnabled && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Zap className="h-3 w-3" /> Auto-reply active (cap: {agentMeta.maxPerConversation ?? 3})
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTurns([])}
            disabled={turns.length === 0 || sending}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t('reset')}
          </Button>
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">{t('emptyTitle')}</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {t('emptyDesc')}
            </p>

            {/* Quick Test Scenarios */}
            <div className="mt-6 w-full max-w-xl">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2.5">
                Quick Test Scenarios
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {QUICK_TEST_PROMPTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => void send(item.prompt)}
                      disabled={sending}
                      className="group flex flex-col justify-start rounded-xl border border-border/70 bg-card p-3 hover:border-primary/50 hover:bg-muted/40 transition-all text-left shadow-xs"
                    >
                      <div className="flex items-center gap-1.5 font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span>{item.label}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {item.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {onGoToSetup && !agentMeta?.configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToSetup}
                className="mt-5 text-xs"
              >
                {t('goToSetup')} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-2.5 items-start',
              turn.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            {turn.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={cn(
                'group relative max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-xs',
                turn.role === 'user'
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm border border-border bg-muted/40 text-foreground',
              )}
            >
              {turn.content && <p className="whitespace-pre-wrap leading-relaxed">{turn.content}</p>}

              {turn.role === 'assistant' && (
                <div className="mt-2 flex items-center justify-between gap-3 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {turn.latencyMs !== undefined && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                        <Zap className="h-2.5 w-2.5 text-amber-500" />
                        {turn.latencyMs}ms
                      </span>
                    )}
                    {turn.handoff && (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <UserCircle2 className="h-3 w-3" />
                        {t('handoff')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyTurn(turn.content, i)}
                    className="opacity-60 hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground"
                    title="Copy response"
                  >
                    {copiedIndex === i ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
            {turn.role === 'user' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
                <UserCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-muted/40 px-3.5 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs">{t('thinking')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts bar (visible when turns > 0) */}
      {turns.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/50 bg-muted/20 px-4 py-1.5 text-xs">
          <span className="text-[11px] font-medium text-muted-foreground shrink-0">Try:</span>
          {QUICK_TEST_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => void send(item.prompt)}
              disabled={sending}
              className="shrink-0 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-border p-3 bg-background">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:bg-background transition-colors"
        />
        <Button
          size="sm"
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          className="h-10 w-10 shrink-0 rounded-xl p-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
