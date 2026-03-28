function ChatHistorySidebar({
  isOpen,
  sessions,
  currentSessionId,
  onCollapse,
  onNewChat,
  onOpenSession,
  onDeleteSession,
}) {
  return (
    <aside className={`chat-history-panel app-frame ${isOpen ? "open" : ""}`}>
      <div className="chat-history-header">
        <button
          className="chat-history-collapse"
          type="button"
          onClick={onCollapse}
          aria-label="Collapse previous chats"
          title="Collapse previous chats (Ctrl or Cmd + B)"
        >
          <span className="chat-history-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M15.7 19.3a1 1 0 0 1-1.4 0L8 13a1.4 1.4 0 0 1 0-2l6.3-6.3a1 1 0 0 1 1.4 1.4L9.83 12l5.87 5.9a1 1 0 0 1 0 1.4Z" />
            </svg>
          </span>
        </button>

        <div>
          <div className="panel-kicker">Workspace</div>
          <h3 className="chat-history-title">Previous Chats</h3>
        </div>

        <button
          className="chat-history-new"
          type="button"
          onClick={onNewChat}
          aria-label="Start new chat"
        >
          +
        </button>
      </div>

      <div className="chat-history-scroll">
        {sessions.length === 0 ? (
          <div className="chat-history-empty">No chats yet. Start one and it will appear here.</div>
        ) : (
          <div className="session-grid single-column">
            {sessions.map((session) => (
              <article
                key={session.id}
                className={`session-card ${currentSessionId === session.id ? "active-chat-session" : ""}`}
                onClick={() => onOpenSession(session.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onOpenSession(session.id);
                }}
              >
                <div className="session-card-top">
                  <span className="session-card-title">{session.title}</span>
                  <button
                    type="button"
                    className="session-delete-btn"
                    aria-label={`Delete ${session.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <span className="trash-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M9 3.75h6a1 1 0 0 1 1 1V6h3a.75.75 0 0 1 0 1.5h-1.02l-.77 10.03A2.5 2.5 0 0 1 14.72 20H9.28a2.5 2.5 0 0 1-2.49-2.47L6.02 7.5H5a.75.75 0 0 1 0-1.5h3V4.75a1 1 0 0 1 1-1Zm5.5 2.25v-.75h-5V6h5ZM8.29 7.5l.75 9.92a1 1 0 0 0 1 .98h4a1 1 0 0 0 1-.98l.75-9.92H8.29ZM10.75 10a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" />
                      </svg>
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export default ChatHistorySidebar;
