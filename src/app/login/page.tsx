"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Sign-in is not configured yet. The administrator must connect the G.H.O.S.T. Supabase project.");
      setBusy(false);
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const next = query.get("next") || "/";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback?next=" + encodeURIComponent(safeNext),
        shouldCreateUser: true,
      },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setMessage("Check your email for a secure sign-in link. The link will return you to G.H.O.S.T.");
    }
    setBusy(false);
  }

  return (
    <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="capture-panel" style={{ width: "100%", maxWidth: 440, padding: 32 }}>
        <div className="eyebrow"><span className="live-dot" /> G.H.O.S.T. ACCOUNT ACCESS</div>
        <h1 style={{ marginTop: 16 }}>Sign in to G.H.O.S.T.</h1>
        <p className="hero-copy" style={{ marginTop: 12 }}>Enter your email and we will send you a one-time sign-in link. No password required.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 24 }}>
          <label htmlFor="ghost-email">Email address</label>
          <input id="ghost-email" className="text-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
          <button className="primary-button" type="submit" disabled={busy || !email.trim()}>{busy ? "Sending link..." : "Email me a sign-in link"}</button>
        </form>
        {message ? <p role="status" style={{ marginTop: 18 }}>{message}</p> : null}
        {error ? <p role="alert" style={{ marginTop: 18, color: "#fca5a5" }}>{error}</p> : null}
        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>Your meeting history currently remains in this browser. Signing in does not sync it across devices.</p>
      </section>
    </main>
  );
}
