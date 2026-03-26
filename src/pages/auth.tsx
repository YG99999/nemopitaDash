import Head from "next/head";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";

import { getBrowserSupabaseClient } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "magic-link">(
    "sign-in"
  );
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = await getBrowserSupabaseClient();

    if (!client) {
      setStatus("Supabase env vars are missing. Add them to enable auth.");
      return;
    }

    setLoading(true);
    setStatus("");

    const redirectTo =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    try {
      if (mode === "sign-up") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo
          }
        });
        if (error) throw error;
        setStatus("Account created. Check your email if confirmation is enabled.");
      } else if (mode === "magic-link") {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo
          }
        });
        if (error) throw error;
        setStatus("Magic link sent. Check your inbox.");
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        await router.push("/");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Pita 22 Dashboard Sign In</title>
      </Head>
      <main className="auth-page">
        <section className="auth-card panel">
          <p className="eyebrow">Pita 22</p>
          <h1>NemoClaw operator dashboard</h1>
          <p className="muted">
            Sign in with Supabase Auth to monitor the agent, review suggestions,
            and keep operations on track.
          </p>

          <div className="tab-row">
            <button
              className={`tab-button ${mode === "sign-in" ? "active" : ""}`}
              onClick={() => setMode("sign-in")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`tab-button ${mode === "sign-up" ? "active" : ""}`}
              onClick={() => setMode("sign-up")}
              type="button"
            >
              Sign up
            </button>
            <button
              className={`tab-button ${mode === "magic-link" ? "active" : ""}`}
              onClick={() => setMode("magic-link")}
              type="button"
            >
              Magic link
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            {mode !== "magic-link" ? (
              <label>
                Password
                <input
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>
            ) : null}

            <button className="button button-primary" disabled={loading} type="submit">
              {loading
                ? "Working..."
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Send magic link"}
            </button>
          </form>

          {status ? <p className="muted">{status}</p> : null}
        </section>
      </main>
    </>
  );
}
