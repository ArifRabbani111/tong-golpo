"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const POLL_MS = 3000;
const NICK_KEY = "matchtalk_nickname";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function EventRoom() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [nickname, setNickname] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const feedEndRef = useRef(null);
  const lastTimestamp = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(NICK_KEY);
    if (stored) setNickname(stored);
  }, []);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((all) => {
        const found = all.find((e) => e.id === id);
        setEvent(found || null);
      });
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const url = lastTimestamp.current
        ? `/api/events/${id}/messages?after=${encodeURIComponent(lastTimestamp.current)}`
        : `/api/events/${id}/messages`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || data.length === 0) return;
        setMessages((prev) => [...prev, ...data]);
        lastTimestamp.current = data[data.length - 1].createdAt;
      } catch {
        // silent fail, will retry next tick
      }
    }

    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [id]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, nickname }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't send that. Try again.");
        return;
      }

      if (!nickname) {
        setNickname(data.nickname);
        window.localStorage.setItem(NICK_KEY, data.nickname);
      }

      setMessages((prev) => [...prev, data]);
      lastTimestamp.current = data.createdAt;
      setDraft("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="wrap">
      <div className="room-header">
        <a className="back-link" href="/">
          ← all events
        </a>
        <div className="room-title">{event ? event.title : "Loading…"}</div>
        {event?.subtitle && <div className="event-sub">{event.subtitle}</div>}
      </div>

      <div className="feed">
        {messages.length === 0 && (
          <div className="empty">Be the first to say something.</div>
        )}
        {messages.map((m) => (
          <div className="bubble" key={m.id}>
            <div className="bubble-top">
              <span
                className={
                  m.nickname === nickname ? "nick you-nick" : "nick"
                }
              >
                {m.nickname}
              </span>
              <span className="time">{formatTime(m.createdAt)}</span>
            </div>
            <div className="body-text">{m.body}</div>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      <div className="composer">
        <div className="composer-row">
          <textarea
            placeholder="Say something about the match…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
          >
            Send
          </button>
        </div>
        <div className="composer-meta">
          <span className={error ? "error-text" : ""}>
            {error || (nickname ? `posting as ${nickname}` : "you'll get a random name on first post")}
          </span>
          <span>{draft.length}/500</span>
        </div>
      </div>
    </div>
  );
}
