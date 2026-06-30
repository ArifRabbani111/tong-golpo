"use client";

import { useEffect, useState } from "react";

const STATUS_LABEL = { live: "Live", upcoming: "Upcoming", ended: "Ended" };

export default function HomePage() {
  const [events, setEvents] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function loadEvents() {
    return fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data));
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), subtitle: subtitle.trim(), status }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Couldn't create that event.");
        return;
      }

      setTitle("");
      setSubtitle("");
      setStatus("upcoming");
      setShowForm(false);
      await loadEvents();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const groups = events
    ? {
        live: events.filter((e) => e.status === "live"),
        upcoming: events.filter((e) => e.status === "upcoming"),
        ended: events.filter((e) => e.status === "ended"),
      }
    : null;

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          Tong<span>Golpo</span>
        </div>
        <div className="tagline">drop your take · no login</div>
      </div>

      <button className="add-event-btn" onClick={() => setShowForm((s) => !s)}>
        {showForm ? "Cancel" : "+ Add an event"}
      </button>

      {showForm && (
        <form className="add-event-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Match or topic, e.g. Mexico vs Ecuador"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
          />
          <input
            type="text"
            placeholder="Subtitle (optional), e.g. Round of 32 · 9PM ET"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={100}
          />
          <div className="form-row">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
            </select>
            <button className="send-btn" type="submit" disabled={submitting || !title.trim()}>
              {submitting ? "Adding…" : "Create event"}
            </button>
          </div>
          {formError && <div className="error-text form-error">{formError}</div>}
        </form>
      )}

      {!events && <div className="empty">Loading events…</div>}

      {events && events.length === 0 && (
        <div className="empty">No events yet. Add the first one.</div>
      )}

      {groups &&
        ["live", "upcoming", "ended"].map((key) =>
          groups[key].length ? (
            <div key={key}>
              <div className="section-label">{STATUS_LABEL[key]}</div>
              {groups[key].map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          ) : null
        )}
    </div>
  );
}

function EventCard({ event }) {
  return (
    <a className="event-card" href={`/event/${event.id}`}>
      <div className="event-top">
        <span className={`status-pill status-${event.status}`}>
          <span className="dot" />
          {STATUS_LABEL[event.status]}
        </span>
        <span className="msg-count">{event._count.messages} msgs</span>
      </div>
      <div className="event-title">{event.title}</div>
      {event.subtitle && <div className="event-sub">{event.subtitle}</div>}
    </a>
  );
}
