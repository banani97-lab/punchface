"use client";

import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { confirmLogin, requestLogin } from "@/actions/auth";
import { Spinner } from "../ui/bits";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ devLink: string | null } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await requestLogin(email);
      if (result.ok) setSent(result.data);
      else setError(result.error);
    });
  }

  if (sent) {
    return (
      <div className="card mt-8 animate-pop-in p-5" role="status">
        <MailCheck size={32} aria-hidden="true" />
        <h2 className="mt-3 text-xl font-extrabold">Check your inbox</h2>
        <p className="mt-1 text-[0.9375rem] text-muted">
          We sent a sign-in link to <strong className="text-fg">{email}</strong>. It works once and expires in 20 minutes.
        </p>
        {sent.devLink ? (
          <p className="mt-4 rounded-xl border-2 border-dashed border-line/40 p-3 text-sm">
            <strong>Development mode:</strong> no email provider is configured, so here’s the link.{" "}
            <a href={sent.devLink} className="linkish break-all">Open sign-in link</a>
          </p>
        ) : null}
        <button type="button" className="btn btn-sm mt-4" onClick={() => setSent(null)}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
      <div>
        <label htmlFor="login-email" className="field-label">Email</label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "login-error" : undefined}
        />
        {error ? <p id="login-error" className="field-error" role="alert">{error}</p> : null}
      </div>
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending || !email.trim()}>
        {pending ? <Spinner /> : null}
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}

export function ConfirmLogin({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-8">
      <button
        type="button"
        className="btn btn-primary btn-lg w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmLogin(token);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {pending ? <Spinner /> : null}
        {pending ? "Signing in…" : "Finish signing in"}
      </button>
      {error ? (
        <p className="field-error mt-3" role="alert">
          {error} <a href="/login" className="linkish">Get a new link</a>
        </p>
      ) : null}
    </div>
  );
}
