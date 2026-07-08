"use client";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, currentUserId, onDelete, onEdit }) {
  const isOwn = message.userId === currentUserId;

  return (
    <div className={`bubble${isOwn ? " bubble-own" : ""}`}>
      <div className="bubble-top">
        <span className={isOwn ? "nick you-nick" : "nick"}>{message.nickname}</span>
        <span className="time">{formatTime(message.createdAt)}</span>
      </div>
      {message.mediaUrl && (
        <div className="media-wrap">
          <img
            src={message.mediaUrl}
            alt=""
            className={`msg-media${message.mediaType === "gif" ? " msg-gif" : ""}`}
            loading="lazy"
          />
        </div>
      )}
      {message.body && <div className="body-text">{message.body}</div>}
      {isOwn && (onDelete || onEdit) && (
        <div className="bubble-actions">
          {onEdit && (
            <button type="button" className="action-btn" onClick={() => onEdit(message)}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" className="action-btn danger" onClick={() => onDelete(message)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatComposer({
  draft,
  setDraft,
  onSend,
  sending,
  error,
  userLabel,
  mediaPreview,
  onMediaSelect,
  onClearMedia,
  uploading,
}) {
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="composer">
      {mediaPreview && (
        <div className="media-preview">
          <img src={mediaPreview.url} alt="Preview" />
          <button type="button" className="clear-media" onClick={onClearMedia}>
            ×
          </button>
        </div>
      )}
      <div className="composer-row">
        <label className="attach-btn" title="Attach image or GIF">
          📎
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={onMediaSelect}
            hidden
            disabled={uploading}
          />
        </label>
        <textarea
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
        />
        <button
          className="send-btn"
          onClick={onSend}
          disabled={sending || uploading || (!draft.trim() && !mediaPreview)}
        >
          {sending || uploading ? "…" : "Send"}
        </button>
      </div>
      <div className="composer-meta">
        <span className={error ? "error-text" : ""}>
          {error || userLabel || ""}
        </span>
        <span>{draft.length}/500</span>
      </div>
    </div>
  );
}

export { formatTime };
