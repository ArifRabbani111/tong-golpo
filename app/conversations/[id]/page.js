"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { authHeaders, getStoredUser, requireAuthRedirect } from "../../lib/clientAuth";
import { getPusherClient, isPusherEnabled } from "../../lib/pusherClient";
import { MessageBubble, ChatComposer } from "../../components/ChatUI";

const POLL_MS = 5000;

export default function ConversationRoom() {
  const { id } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState(null);
  const [otherName, setOtherName] = useState("");
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
    if (!requireAuthRedirect(router, `/conversations/${id}`)) return;
    setUser(getStoredUser());
  }, [router, id]);

  useEffect(() => {
    fetch("/api/conversations", { headers: authHeaders() })
      .then((r) => r.json())
      .then((all) => {
        const found = all.find((c) => c.id === id);
        if (found) setOtherName(found.otherUser?.nickname || "Chat");
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadHistory() {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        headers: authHeaders(),
      });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      data.forEach((m) => seenIds.current.add(m.id));
      setMessages(data);
      if (data.length) lastTimestamp.current = data[data.length - 1].createdAt;
    }

    loadHistory();

    if (isPusherEnabled()) {
      const pusher = getPusherClient();
      const channel = pusher.subscribe(`private-conversation-${id}`);
      channel.bind("new-message", (msg) => {
        if (!cancelled) appendMessages([msg]);
      });
      setLive(true);

      return () => {
        cancelled = true;
        channel.unbind_all();
        pusher.unsubscribe(`private-conversation-${id}`);
      };
    }

    const poll = setInterval(async () => {
      const url = lastTimestamp.current
        ? `/api/conversations/${id}/messages?after=${encodeURIComponent(lastTimestamp.current)}`
        : `/api/conversations/${id}/messages`;
      try {
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        appendMessages(data);
        if (data.length) lastTimestamp.current = data[data.length - 1].createdAt;
      } catch {
        // silent
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
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
      const res = await fetch(`/api/conversations/${id}/messages`, {
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
        setError(data.error || "Couldn't send.");
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

  return (
    <div className="wrap">
      <div className="room-header">
        <a className="back-link" href="/conversations">
          ← messages
        </a>
        <div className="room-title">{otherName || "Loading…"}</div>
        {live && <div className="live-badge">● Live</div>}
      </div>

      <div className="feed">
        {messages.length === 0 && (
          <div className="empty">Say hello.</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} currentUserId={user?.id} />
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
        mediaPreview={mediaPreview}
        onMediaSelect={handleMediaSelect}
        onClearMedia={() => setMediaPreview(null)}
      />
    </div>
  );
}
