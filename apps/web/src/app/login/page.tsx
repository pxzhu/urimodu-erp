"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, apiRequest } from "../../lib/api";
import { saveSession, type LoginSession } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@acme.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const session = await apiRequest<LoginSession>("/auth/login", {
        method: "POST",
        body: {
          email,
          password,
          provider: "local"
        }
      });

      saveSession(session);
      router.push("/companies");
    } catch (submissionError) {
      if (submissionError instanceof ApiError) {
        setError(submissionError.message);
      } else {
        setError("Unexpected login error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>Sign In</h1>
      <p>Local development auth is enabled. Use seeded users to continue.</p>
      <p>
        Default seeded credential: <code>admin@acme.local / ChangeMe123!</code>
      </p>
      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
    </main>
  );
}
