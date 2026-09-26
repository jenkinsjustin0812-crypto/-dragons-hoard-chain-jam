"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LoginScreenProps {
  onLogin: () => void;
  onCreate: () => void;
}

export default function LoginScreen({
  onLogin,
  onCreate,
}: LoginScreenProps) {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!password) {
      setError("Enter your access password.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        throw loginError;
      }

      window.localStorage.setItem(
        "dragon_hoard_logged_in",
        "true"
      );

      onLogin();
    } catch (error) {
      console.error("Login error:", error);

      if (error instanceof Error) {
        setError("Invalid email or password.");
      } else {
        setError("Unable to enter the vault.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background-glow" />

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-dragon">🐉</div>

          <div className="auth-kicker">
            CHAIN · PRIVATE VAULT
          </div>

          <h1>DRAGON&apos;S HOARD</h1>

          <p>
            The vault remembers those who dare to enter.
          </p>
        </div>

        <section className="auth-card">
          <div className="auth-card-top">
            <div>
              <span className="auth-label">
                VAULT ACCESS
              </span>

              <h2>Enter the Hoard</h2>
            </div>

            <span className="auth-status">
              ● SECURE
            </span>
          </div>

          <div className="auth-divider" />

          <div className="auth-field">
            <label htmlFor="login-email">
              EMAIL ADDRESS
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">
              ACCESS PASSWORD
            </label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="auth-error">
              <span>!</span>
              {error}
            </div>
          )}

          <button
            type="button"
            className="auth-enter-button"
            onClick={handleLogin}
            disabled={loading}
          >
            <span>
              {loading
                ? "ENTERING..."
                : "ENTER THE VAULT"}
            </span>

            <span>→</span>
          </button>

          <div className="auth-security">
            <span>⛓</span>

            <div>
              <strong>BLOCKCHAIN SECURITY</strong>

              <p>
                Your blockchain wallet remains controlled
                by MetaMask. Never share your recovery phrase.
              </p>
            </div>
          </div>
        </section>

        <div className="auth-create">
          <span>NEW TO THE HOARD?</span>

          <button
            type="button"
            onClick={onCreate}
          >
            CREATE VAULT ACCESS
          </button>
        </div>

        <div className="auth-footer">
          <span>DRAGON&apos;S HOARD</span>
          <span>•</span>
          <span>CHAIN CASINO</span>
          <span>•</span>
          <span>VRF SECURED</span>
        </div>
      </div>
    </main>
  );
}