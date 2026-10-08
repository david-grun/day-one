"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Layers3, LoaderCircle } from "lucide-react";

const accounts = [
  { name: "Mara Santos", email: "mara@demo.dayone.test", role: "HR coordinator & reviewer" },
  { name: "Bea Lim", email: "bea@demo.dayone.test", role: "HR reviewer" },
  { name: "Nico Reyes", email: "nico@demo.dayone.test", role: "IT preparation" },
  { name: "Sam Cruz", email: "sam@demo.dayone.test", role: "IT preparation" },
  { name: "Alex Chen", email: "alex@demo.dayone.test", role: "Hiring manager" },
  { name: "Jamie Flores", email: "jamie@demo.dayone.test", role: "Hiring manager" },
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(accounts[0].email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error?.message || "Sign-in failed. Check your email and password.");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Check the connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="About DayOne">
        <Link href="/" className="brand"><span className="brand-mark"><Layers3 size={23} /></span><span>DayOne</span></Link>
        <div className="login-story-content">
          <h1>First-day<br />readiness.</h1>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <h2>Sign in</h2>
          <form onSubmit={signIn} className="login-form">
            <label className="field">Work email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={error ? "login-error" : undefined} /></label>
            <label className="field">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={error ? "login-error" : undefined} /></label>
            {error && <div id="login-error" role="alert" className="notice error">{error}</div>}
            <button type="submit" className="button primary login-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{busy ? "Signing in…" : "Sign in"}<ArrowRight size={17} /></button>
          </form>
          <details className="demo-accounts">
            <summary>Demo accounts <ChevronRight size={15} /></summary>
            <div className="demo-account-list">{accounts.map((account) => <button type="button" key={account.email} onClick={() => { setEmail(account.email); setPassword("DayOneDemo!2026"); setError(""); }}><span><strong>{account.name}</strong><small>{account.role}</small></span><ArrowRight size={15} /></button>)}</div>
            <p className="demo-password">Demo password: <code>DayOneDemo!2026</code></p>
          </details>
          <p className="login-disclaimer">Fictional demo data only.</p>
        </div>
      </section>
    </main>
  );
}
