"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStoredUser, authHeaders, requireAuthRedirect } from "../../lib/clientAuth";
import { MessageBubble, ChatComposer } from "../../components/ChatUI";

const POLL_MS = 5000;

export default function EventRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [live, setLive] = useState(false);
  const feedEndRef = useRef(null);
  const lastTimestamp = useRef(null);
  const seenIds = useRef(new Set());

  const appendMessages = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const next = [...prev];
      for (const m of incoming) {
        if (!seenIds.current.has(m.id)) {
          seenIds.current.add(m.id);
          next.push(m);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!requireAuthRedirect(router, `/event/${id}`)) return;
    setUser(getStoredUser());
  }, [router, id]);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((all) => {
        const found = all.find((e) => e.id === id);
        setEvent(found || null);
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function setupRealtime() {
      // Initial load of messages
      try {
        const res = await fetch(`/api/events/${id}/messages`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        data.forEach((m) => seenIds.current.add(m.id));
        setMessages(data);
        if (data.length) lastTimestamp.current = data[data.length - 1].createdAt;
      } catch {
        console.error("Failed to load messages");
      }

      // Subscribe to new messages via Supabase Realtime
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const channel = supabase
          .channel(`chat:${id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "Message",
              filter: `eventId=eq.${id}`,
            },
            (payload) => {
              if (!cancelled) {
                appendMessages([payload.new]);
                setLive(true);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        console.warn("Supabase Realtime failed, falling back to polling:", err);
        // Fallback to polling if Realtime fails
        const poll = setInterval(async () => {
          const url = lastTimestamp.current
            ? `/api/events/${id}/messages?after=${encodeURIComponent(lastTimestamp.current)}`
            : `/api/events/${id}/messages`;
          try {
            const res = await fetch(url);
            if (!res.ok || cancelled) return;
            const data = await res.json();
            appendMessages(data);
            if (data.length) lastTimestamp.current = data[data.length - 1].createdAt;
          } catch {
            // silent
          }
        }, POLL_MS);

        return () => clearInterval(poll);
      }
    }

    const cleanup = setupRealtime();
    return () => {
      cancelled = true;
      cleanup?.then((fn) => fn?.());
    };
  }, [id, appendMessages]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleMediaSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      setMediaPreview({ url: data.url, mediaType: data.mediaType });
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if ((!text && !mediaPreview) || sending) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          body: text,
          mediaUrl: mediaPreview?.url || null,
          mediaType: mediaPreview?.mediaType || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Couldn't send that.");
        return;
      }

      if (!live) appendMessages([data]);
      setDraft("");
      setMediaPreview(null);
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(message) {
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/events/${id}/messages/${message.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      seenIds.current.delete(message.id);
    }
  }

  async function handleEdit(message) {
    const next = prompt("Edit message:", message.body);
    if (next === null || next.trim() === message.body) return;
    const res = await fetch(`/api/events/${id}/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ body: next.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
  }

  const displayName = user?.nickname?.startsWith("anon_")
    ? user.nickname.replace(/^anon_/, "Guest ")
    : user?.nickname || user?.email || "you";

  return (
    <div className="wrap">
      <div className="room-header">
        <a className="back-link" href="/">
          ← all events
        </a>
        <div className="room-title">{event ? event.title : "Loading…"}</div>
        {event?.subtitle && <div className="event-sub">{event.subtitle}</div>}
        {live && <div className="live-badge">● Live</div>}
      </div>

      <div className="feed">
        {messages.length === 0 && (
          <div className="empty">Be the first to say something.</div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            currentUserId={user?.id}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
        <div ref={feedEndRef} />
      </div>

      <ChatComposer
        draft={draft}
        setDraft={setDraft}
        onSend={handleSend}
        sending={sending}
        uploading={uploading}
        error={error}
        userLabel={`posting as ${displayName}`}
        mediaPreview={mediaPreview}
        onMediaSelect={handleMediaSelect}
        onClearMedia={() => setMediaPreview(null)}
      />
    </div>
  );
}