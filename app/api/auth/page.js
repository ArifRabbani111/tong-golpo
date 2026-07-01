"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const AUTH_SESSION_KEY = "matchtalk_anonSessionId";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [mode, setMode] = useState("login"); // "login", "signup", or "anon"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getOrCreateSessionId() {
    let sessionId = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2, 10); // Random 8-char string
      window.localStorage.setItem(AUTH_SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let endpoint, body;

      if (mode === "signup") {
        endpoint = "/api/auth/signup";
        if (!email || !password) {
          setError("Email and password required.");
          setLoading(false);
          return;
        }
        body = { email, password };
      } else if (mode === "anon") {
        endpoint = "/api/auth/login";
        body = { anonymous: true, sessionId: getOrCreateSessionId() };
      } else {
        // mode === "login"
        endpoint = "/api/auth/login";
        if (!email || !password) {
          setError("Email and password required.");
          setLoading(false);
          return;
        }
        body = { email, password };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Auth failed.");
        setLoading(false);
        return;
      }

      // Store token and user
      window.localStorage.setItem("token", data.token);
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.id,
          email: data.email,
          nickname: data.nickname,
          isAnonymous: data.isAnonymous,
        })
      );

      // Redirect
      router.push(returnTo);
    } catch (err) {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="wrap auth-page">
      <div className="topbar">
        <div className="brand">
          Match<span>Talk</span>
        </div>
      </div>

      <div className="auth-box">
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            className={mode === "signup" ? "tab active" : "tab"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
          <button
            className={mode === "anon" ? "tab active" : "tab"}
            onClick={() => setMode("anon")}
          >
            Anonymous
          </button>
        </div>

        {mode === "anon" ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <p className="anon-info">
              Post anonymously. Your session will be remembered so your messages stay linked.
            </p>
            <button
              type="submit"
              className="send-btn"
              disabled={loading}
              style={{ marginTop: "10px" }}
            >
              {loading ? "Loading…" : "Continue anonymously"}
            </button>
            {error && <div className="error-text form-error">{error}</div>}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "signup" && (
              <div className="password-hint">At least 8 characters</div>
            )}
            <button
              type="submit"
              className="send-btn"
              disabled={loading || !email || !password}
            >
              {loading
                ? "Loading…"
                : mode === "login"
                ? "Log in"
                : "Sign up"}
            </button>
            {error && <div className="error-text form-error">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}