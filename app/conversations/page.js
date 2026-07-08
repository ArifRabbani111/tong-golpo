"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHeaders, getStoredUser, requireAuthRedirect, logout } from "../../lib/clientAuth";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requireAuthRedirect(router, "/conversations")) return;
    setUser(getStoredUser());
    loadConversations();
  }, [router]);

  async function loadConversations() {
    try {
      const res = await fetch("/api/conversations", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setConversations(data);
    } catch {
      setError("Couldn't load conversations.");
    }
  }

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
      });
      if (res.ok) setResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function startConversation(participantId) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ participantId }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/conversations/${data.id}`);
    } else {
      setError(data.error || "Couldn't start conversation.");
    }
  }

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          Tong<span>Golpo</span>
        </div>
        <div className="nav-links">
          <a href="/">Events</a>
          {user && (
            <button type="button" className="link-btn" onClick={() => { logout(); router.push("/auth"); }}>
              Log out
            </button>
          )}
        </div>
      </div>

      <div className="section-label">Private messages</div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search users to message…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              className="search-result"
              onClick={() => startConversation(u.id)}
            >
              {u.nickname}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-text form-error">{error}</div>}

      {!conversations && <div className="empty">Loading…</div>}
      {conversations?.length === 0 && (
        <div className="empty">No conversations yet. Search for someone above.</div>
      )}

      {conversations?.map((c) => (
        <a key={c.id} className="event-card dm-card" href={`/conversations/${c.id}`}>
          <div className="event-top">
            <span className="event-title">{c.otherUser?.nickname || "Unknown"}</span>
            {c.lastMessage && (
              <span className="time">{formatTime(c.lastMessage.createdAt)}</span>
            )}
          </div>
          {c.lastMessage && (
            <div className="event-sub dm-preview">{c.lastMessage.body}</div>
          )}
        </a>
      ))}
    </div>
  );
}
