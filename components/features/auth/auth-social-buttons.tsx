"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/toast";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.5-2.4 1.9C5.1 19.3 8.3 21.2 12 21.2c2.1 0 3.9-.7 5.2-1.9l-3.1-2.4c-.8.5-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8z"
      />
      <path
        fill="#4A90E2"
        d="M3.5 7.3C2.9 8.5 2.5 9.9 2.5 11.4c0 1.5.4 2.9 1 4.1l3.1-2.4c-.3-.8-.5-1.6-.5-2.5 0-.8.2-1.6.5-2.3L3.5 7.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.2 0 2.2.4 3.1 1.2l2.3-2.3C15.9 2.8 14.1 2 12 2 8.3 2 5.1 3.9 3.5 7.3l3.1 2.4C7.3 6.9 9.4 5.3 12 5.3z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.2zm-2.4-6.4c.6-.7 1-1.7.9-2.7-.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-1 2.6 1 .1 1.9-.5 2.6-1.2z" />
    </svg>
  );
}

const PROVIDERS = [
  { id: "google" as const, label: "Google", icon: GoogleIcon },
  { id: "azure" as const, label: "Microsoft", icon: MicrosoftIcon },
  { id: "apple" as const, label: "Apple", icon: AppleIcon },
];

export function AuthSocialButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function continueWith(provider: (typeof PROVIDERS)[number]["id"]) {
    setLoading(provider);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (oauthError) {
      notify.error(
        `${oauthError.message}. Enable this provider in Supabase Auth, or use email instead.`
      );
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative py-1 text-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--m-line)]" />
        <span className="relative bg-white px-3 text-xs font-medium text-[var(--m-muted)]">
          Or continue with
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {PROVIDERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={loading !== null}
            onClick={() => continueWith(id)}
            className="inline-flex h-11 items-center justify-center gap-2 border border-[var(--m-line)] bg-white px-2 text-xs font-medium text-[var(--m-ink-soft)] transition-colors hover:bg-[var(--m-mist)] disabled:opacity-60"
          >
            <Icon />
            <span className="hidden sm:inline">{loading === id ? "…" : label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
