"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface WalletOnboardingProps {
  onComplete: () => void;
}

export default function WalletOnboarding({
  onComplete,
}: WalletOnboardingProps) {
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    setError("");

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      setError("Enter your vault identity.");
      return;
    }

    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Create the authentication account.
       *
       * Supabase securely handles the password.
       * The username is stored as user metadata.
       */
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              username: cleanUsername,
            },
          },
        });

      if (signUpError) {
        console.error("Supabase signup error:", signUpError);

        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("Account creation failed.");
        return;
      }

      /*
       * If email confirmation is disabled,
       * Supabase gives us a session immediately.
       */
      if (data.session) {
        onComplete();
        return;
      }

      /*
       * If email confirmation is enabled,
       * the account exists but the player must
       * confirm the email before entering.
       */
      setError(
        "Account created successfully. Check your email to confirm your account, then sign in."
      );
    } catch (error) {
      console.error("Create account error:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          "Something went wrong while creating your vault."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="wallet-onboarding">
      <div className="wallet-onboarding-card">
        <div className="wallet-dragon">
          🐉
        </div>

        <div className="wallet-eyebrow">
          DRAGON&apos;S HOARD · SECURE ACCESS
        </div>

        <h1>CREATE YOUR VAULT</h1>

        <p>
          Create your Dragon&apos;s Hoard identity and secure
          access to your vault.
        </p>

        <div className="wallet-field">
          <label htmlFor="vault-username">
            VAULT IDENTITY
          </label>

          <input
            id="vault-username"
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Choose your identity"
            autoComplete="username"
          />
        </div>

        <div className="wallet-field">
          <label htmlFor="vault-email">
            EMAIL ADDRESS
          </label>

          <input
            id="vault-email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="wallet-field">
          <label htmlFor="vault-password">
            ACCESS PASSWORD
          </label>

          <input
            id="vault-password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="wallet-field">
          <label htmlFor="vault-confirm-password">
            CONFIRM PASSWORD
          </label>

          <input
            id="vault-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="Enter password again"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="wallet-form-error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="wallet-primary-button"
          onClick={createAccount}
          disabled={loading}
        >
          {loading
            ? "CREATING VAULT..."
            : "CREATE VAULT ACCESS"}
        </button>

        <div className="wallet-disclaimer">
          <strong>SECURITY</strong>

          <p>
            Your password is managed by Supabase
            Authentication. Dragon&apos;s Hoard never stores
            your raw password.
          </p>
        </div>
      </div>
    </section>
  );
}