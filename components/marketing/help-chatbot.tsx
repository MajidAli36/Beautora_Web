"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import { HELP_SUGGESTIONS } from "@/lib/marketing/help-knowledge";
import { cn } from "@/lib/utils";

type ChatLink = { label: string; href: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: ChatLink[];
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Hi — I’m the Beautora assistant. Ask anything about the platform: pricing, booking, POS, sales, staff, inventory, reports, finances, WhatsApp, billing, and more.",
  links: [
    { label: "All features", href: "/#platform" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Start free", href: "/signup" },
  ],
};

export function HelpChatbot() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, [open, messages, pending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setError(null);
    setInput("");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);

    try {
      const res = await fetch("/api/marketing/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = (await res.json()) as {
        error?: string;
        answer?: string;
        links?: ChatLink[];
      };
      if (!res.ok || !data.answer) {
        setError(data.error ?? "Could not answer right now. Try again.");
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.answer!,
          links: data.links ?? [],
        },
      ]);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col items-end gap-3",
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1.25rem+env(safe-area-inset-right,0px))]"
      )}
    >
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Beautora help assistant"
          className="flex w-[min(100vw-2rem,22.5rem)] flex-col overflow-hidden border border-[var(--m-line)] bg-[var(--m-paper)] shadow-[0_12px_40px_rgba(20,16,12,0.18)]"
          style={{ maxHeight: "min(32rem, calc(100vh - 6.5rem))" }}
        >
          <div className="flex items-start justify-between gap-3 bg-[var(--m-ink)] px-4 py-3 text-[var(--m-paper)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
                Beautora
              </p>
              <p className="mt-1 font-display text-lg font-medium leading-tight">
                Ask about the platform
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 shrink-0 items-center justify-center text-white/70 transition-colors hover:text-white"
              aria-label="Close help chat"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[92%] text-sm leading-relaxed",
                  m.role === "user" ? "ml-auto" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "px-3 py-2",
                    m.role === "user"
                      ? "bg-[var(--m-ink)] text-[var(--m-paper)]"
                      : "border border-[var(--m-line)] bg-[var(--m-mist)] text-[var(--m-ink)]"
                  )}
                >
                  {m.text}
                </div>
                {m.links && m.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.links.map((link) => (
                      <Link
                        key={link.href + link.label}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="border border-[var(--m-line)] bg-[var(--m-paper)] px-2 py-1 text-xs font-medium text-[var(--m-ink)] transition-colors hover:border-[var(--m-ink)]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <p className="text-xs text-[var(--m-muted)]">Thinking…</p>
            )}
            {error && (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-[var(--m-line)] bg-[var(--m-mist)] px-3 py-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
              Suggested
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {HELP_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => void ask(s)}
                  className="border border-[var(--m-line)] bg-[var(--m-paper)] px-2 py-1 text-left text-[11px] text-[var(--m-ink-soft)] transition-colors hover:border-[var(--m-ink)] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                maxLength={500}
                disabled={pending}
                className="h-10 min-w-0 flex-1 border border-[var(--m-line)] bg-[var(--m-paper)] px-3 text-sm text-[var(--m-ink)] outline-none placeholder:text-[var(--m-muted)] focus:border-[var(--m-ink)] disabled:opacity-60"
                aria-label="Your question"
              />
              <button
                type="submit"
                disabled={pending || !input.trim()}
                className="inline-flex size-10 shrink-0 items-center justify-center bg-[var(--m-ink)] text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close help chat" : "Open Beautora help chat"}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 bg-[var(--m-ink)] px-4 text-sm font-semibold tracking-wide text-[var(--m-paper)] shadow-lg transition-colors",
          "hover:bg-[var(--m-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent)] focus-visible:ring-offset-2"
        )}
      >
        {open ? <X className="size-4" /> : <MessageCircle className="size-4" />}
        {open ? "Close" : "Ask Beautora"}
      </button>
    </div>
  );
}
