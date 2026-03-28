function ChatPageLayout({
  liveStatus,
  onOpenUsagePanel,
  onCloseChat,
  isHistoryOpen,
  onToggleHistory,
  isCompactViewport,
  onCloseHistoryBackdrop,
  historySidebar,
  children,
}) {
  return (
    <section className="chat-page-shell screen-panel">
      <aside className="chat-page-rail app-frame" aria-label="Chat controls">
        <button
          className="chat-history-edge-toggle"
          type="button"
          onClick={onToggleHistory}
          aria-label={isHistoryOpen ? "Collapse previous chats" : "Open previous chats"}
          title={isHistoryOpen
            ? "Collapse previous chats (Ctrl or Cmd + B)"
            : "Open previous chats (Ctrl or Cmd + B)"}
        >
          <span className="chat-history-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M4 7h16M4 12h12M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>
      </aside>

      <div className="chat-page-main">
        <header className="topbar chat-topbar-seamless app-frame">
          <div className="brand-block">
            <h1>Decision Autopsy</h1>
          </div>

          <div className="topbar-actions">
            <button
              className={`status-chip ${liveStatus}`}
              type="button"
              onClick={onOpenUsagePanel}
            >
              <span className="status-dot" />
              {liveStatus === "online" ? "Live" : liveStatus === "offline" ? "Offline" : "Checking"}
            </button>
            <button className="ghost-btn icon-btn" type="button" onClick={onCloseChat} aria-label="Close chat">
              <span className="icon-plus close-mark" aria-hidden="true">×</span>
            </button>
          </div>
        </header>

        <main className="chat-layout chat-layout-seamless">
          <div className={`chat-workspace ${isHistoryOpen ? "history-open" : ""}`}>
            {historySidebar}
            {children}
          </div>

          {isCompactViewport && isHistoryOpen ? (
            <button
              className="chat-history-backdrop"
              type="button"
              aria-label="Close previous chats"
              onClick={onCloseHistoryBackdrop}
            />
          ) : null}
        </main>
      </div>
    </section>
  );
}

export default ChatPageLayout;
