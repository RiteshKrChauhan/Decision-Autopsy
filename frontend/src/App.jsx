import { useEffect, useMemo, useState } from "react";
import {
  getApiUsage,
  getBackendHealth,
  runListener,
  runQuestioner,
  subscribeToApiDebug,
} from "./services/apiClient.js";
import { createInitialContext } from "./state/context.js";
import MessageList from "./components/MessageList.jsx";
import QuestionCard from "./components/QuestionCard.jsx";
import Composer from "./components/Composer.jsx";

const STORAGE_KEY = "decision-autopsy-sessions-v2";

function createSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDraftSession(overrides = {}) {
  return {
    id: createSessionId(),
    title: "",
    preview: "",
    updatedAt: new Date().toISOString(),
    ctx: createInitialContext(),
    messages: [],
    pendingQuestion: null,
    state: "idle",
    isTyping: false,
    ...overrides,
  };
}

function isEmptySession(session) {
  return !session.ctx.decision && session.messages.length === 0 && !session.pendingQuestion;
}

function getSessionTitle(session) {
  return session.ctx.decision || "Untitled decision";
}

function getSessionPreview(session) {
  if (session.ctx.situation_summary) return session.ctx.situation_summary;
  const firstUserMessage = session.messages.find((item) => item.type === "user");
  if (firstUserMessage?.content) return firstUserMessage.content;
  return "No summary yet.";
}

function syncSessionList(list, session) {
  if (!session || isEmptySession(session)) {
    return list.filter((item) => item.id !== session?.id);
  }

  const nextSession = {
    ...session,
    title: getSessionTitle(session),
    preview: getSessionPreview(session),
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = list.findIndex((item) => item.id === nextSession.id);
  if (existingIndex === -1) {
    return [nextSession, ...list];
  }

  const nextList = [...list];
  nextList[existingIndex] = nextSession;
  return nextList.sort((left, right) => (
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  ));
}

function loadSessions() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...createDraftSession(),
      ...item,
      ctx: {
        ...createInitialContext(),
        ...item.ctx,
      },
      messages: Array.isArray(item.messages) ? item.messages : [],
      pendingQuestion: item.pendingQuestion ?? null,
    }));
  } catch {
    return [];
  }
}

function getConfidenceColor(value) {
  if (value >= 70) return "#37b26c";
  if (value >= 45) return "#d08921";
  return "#4c6ef5";
}

function buildBackendContext(ctx) {
  const additionalAnswers = Object.fromEntries(
    ctx.question_history
      .filter((item) => typeof item.answer === "string" && item.answer.trim())
      .map((item) => [item.question_id, item.answer])
  );

  return {
    decision: {
      title: ctx.decision || null,
      description: ctx.situation_summary || ctx.decision || null,
    },
    answers: {
      additional_answers: additionalAnswers,
    },
    listener_result: ctx.listener_result,
    question_history: ctx.question_history,
  };
}

function normalizeQuestionRecord(question, answer) {
  return {
    question_id: question.question_id,
    question: question.question,
    priority: question.priority,
    rationale: question.rationale,
    answer,
  };
}

function formatNumber(value) {
  if (typeof value !== "number") return "--";
  return value.toLocaleString();
}

function formatResetAt(value) {
  if (!value) return "--";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatUpdatedAt(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function runWithTransition(update) {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
    update();
    return;
  }

  document.startViewTransition(() => {
    update();
  });
}

export default function App() {
  const [view, setView] = useState("home");
  const [sessions, setSessions] = useState(() => loadSessions());
  const [currentSession, setCurrentSession] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [apiEntries, setApiEntries] = useState([]);
  const [liveStatus, setLiveStatus] = useState("checking");
  const [usageSnapshot, setUsageSnapshot] = useState(null);
  const [usageError, setUsageError] = useState("");
  const [usageLoading, setUsageLoading] = useState(false);

  const ctx = currentSession?.ctx ?? createInitialContext();
  const messages = currentSession?.messages ?? [];
  const pendingQuestion = currentSession?.pendingQuestion ?? null;
  const state = currentSession?.state ?? "idle";
  const isTyping = currentSession?.isTyping ?? false;
  const inputDisabled = ["parsing", "questioning"].includes(state);
  const answeredCount = ctx.question_history.filter((item) => item.answer).length;
  const skippedCount = ctx.skipped.length;
  const missingItems = ctx.listener_result?.missing_information ?? [];
  const activeSessions = useMemo(
    () => [...sessions].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)),
    [sessions]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => subscribeToApiDebug(setApiEntries), []);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        await getBackendHealth();
        if (!cancelled) setLiveStatus("online");
      } catch {
        if (!cancelled) setLiveStatus("offline");
      }
    }

    checkHealth();
    const timer = setInterval(checkHealth, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!showApiPanel) return;
    refreshUsage();
  }, [showApiPanel]);

  function updateCurrentSession(transform) {
    setCurrentSession((current) => {
      const base = current ?? createDraftSession();
      const next = {
        ...transform(base),
        updatedAt: new Date().toISOString(),
      };

      setSessions((previous) => syncSessionList(previous, next));
      return next;
    });
  }

  async function refreshUsage() {
    setUsageLoading(true);
    setUsageError("");

    try {
      const usage = await getApiUsage();
      setUsageSnapshot(usage);
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : String(error));
    } finally {
      setUsageLoading(false);
    }
  }

  function addMessage(type, content, extra = {}) {
    updateCurrentSession((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          content,
          ...extra,
        },
      ],
    }));
  }

  function openNewChat() {
    runWithTransition(() => {
      setCurrentSession(createDraftSession());
      setInputValue("");
      setView("chat");
    });
  }

  function openSession(sessionId) {
    const next = sessions.find((item) => item.id === sessionId);
    if (!next) return;

    runWithTransition(() => {
      setCurrentSession(next);
      setInputValue("");
      setView("chat");
    });
  }

  function closeChat() {
    runWithTransition(() => {
      if (currentSession) {
        setSessions((previous) => syncSessionList(previous, currentSession));
      }
      setCurrentSession(null);
      setInputValue("");
      setView("home");
    });
  }

  async function safeRequest(action) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      updateCurrentSession((current) => ({
        ...current,
        isTyping: false,
        state: "error",
      }));
      addMessage("error", "The live backend request failed. Check the backend server and try again.");
      return null;
    }
  }

  async function fetchQuestions(nextCtx, prompt) {
    updateCurrentSession((current) => ({
      ...current,
      isTyping: true,
      state: "questioning",
      ctx: nextCtx,
    }));

    const response = await safeRequest(() => runQuestioner(buildBackendContext(nextCtx), prompt));
    if (!response) return;

    const questions = response.output.questions ?? [];
    const nextQuestion = questions[0] ?? null;

    updateCurrentSession((current) => ({
      ...current,
      isTyping: false,
      state: nextQuestion ? "questioning" : "complete",
      pendingQuestion: nextQuestion,
      ctx: {
        ...current.ctx,
        active_questions: questions,
      },
      messages: nextQuestion
        ? [
            ...current.messages,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              type: "ai",
              content: `Focus: ${response.output.recommended_focus}`,
            },
          ]
        : [
            ...current.messages,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              type: "ai",
              content: "Listener and Questioner completed. Downstream agents are not wired into the UI yet.",
            },
          ],
    }));
  }

  async function startDecision(text) {
    const baseCtx = {
      ...createInitialContext(),
      decision: text,
    };

    updateCurrentSession((current) => ({
      ...current,
      state: "parsing",
      isTyping: true,
      ctx: baseCtx,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "user",
          content: text,
        },
      ],
    }));

    const listenerResponse = await safeRequest(() => runListener(buildBackendContext(baseCtx), text));
    if (!listenerResponse) return;

    const listenerOutput = listenerResponse.output;
    const parsedCtx = {
      ...baseCtx,
      confidence: listenerOutput.confidence_score,
      clarity: listenerOutput.clarity_score,
      situation_summary: listenerOutput.situation_summary,
      listener_result: listenerOutput,
    };

    updateCurrentSession((current) => ({
      ...current,
      isTyping: false,
      state: "idle",
      ctx: parsedCtx,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: listenerOutput.situation_summary,
          muted: `Missing: ${listenerOutput.missing_information.join(", ") || "none"}`,
        },
      ],
    }));

    await fetchQuestions(parsedCtx, "Ask the next best questions.");
  }

  async function onQuestionAnswer(question, answer) {
    const nextCtx = {
      ...ctx,
      question_history: [
        ...ctx.question_history,
        normalizeQuestionRecord(question, answer),
      ],
      active_questions: ctx.active_questions.filter(
        (item) => item.question_id !== question.question_id
      ),
    };

    updateCurrentSession((current) => ({
      ...current,
      ctx: nextCtx,
      pendingQuestion: null,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "user",
          content: answer,
        },
      ],
    }));

    const nextQuestion = nextCtx.active_questions[0] ?? null;
    if (nextQuestion) {
      updateCurrentSession((current) => ({
        ...current,
        pendingQuestion: nextQuestion,
      }));
      return;
    }

    await fetchQuestions(nextCtx, "Given the current answers, ask the next best unanswered question.");
  }

  async function onQuestionSkip(question) {
    const nextCtx = {
      ...ctx,
      skipped: [...ctx.skipped, question.question_id],
      question_history: [
        ...ctx.question_history,
        normalizeQuestionRecord(question, null),
      ],
      active_questions: ctx.active_questions.filter(
        (item) => item.question_id !== question.question_id
      ),
    };

    updateCurrentSession((current) => ({
      ...current,
      ctx: nextCtx,
      pendingQuestion: null,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: `Skipped: ${question.question}`,
        },
      ],
    }));

    const nextQuestion = nextCtx.active_questions[0] ?? null;
    if (nextQuestion) {
      updateCurrentSession((current) => ({
        ...current,
        pendingQuestion: nextQuestion,
      }));
      return;
    }

    await fetchQuestions(nextCtx, "A question was skipped. Ask the next best unanswered question.");
  }

  async function onSubmitInput(text) {
    const value = text.trim();
    if (!value || inputDisabled) return;

    setInputValue("");

    if (!ctx.decision) {
      await startDecision(value);
      return;
    }

    addMessage("error", "Use the active question card below. Free-form follow-up chat is not connected yet.");
  }

  const usagePercent = usageSnapshot?.percentage || "0%";
  const usageBarWidth = typeof usageSnapshot?.month_usage === "number" &&
    typeof usageSnapshot?.month_limit === "number" &&
    usageSnapshot.month_limit > 0
    ? `${Math.min((usageSnapshot.month_usage / usageSnapshot.month_limit) * 100, 100)}%`
    : "0%";

  const homeQuote = useMemo(() => [
    "Good decisions usually fail before they are made. They fail when the real trade-off stays unnamed.",
    "Decision Autopsy turns a vague choice into a visible one: what you are optimizing for, what is still unknown, and what fear is steering the answer.",
    "It does not think for you. It forces the decision into the open so you can inspect it properly.",
  ], []);

  return (
    <>
      <div className="bg-glow bg-glow-left" />
      <div className="bg-glow bg-glow-right" />

      {showApiPanel ? (
        <aside className="api-panel">
          <div className="api-panel-header">
            <div className="api-panel-title-group">
              <div className="api-panel-kicker">Decision Autopsy</div>
              <strong>ABBY API Checker</strong>
            </div>
            <button
              className="api-panel-close"
              type="button"
              onClick={() => setShowApiPanel(false)}
            >
              Close
            </button>
          </div>

          <div className="api-panel-rule" />

          <div className="api-panel-body">
            <section className="usage-card">
              <div className="usage-card-top">
                <div>
                  <div className="api-block-label">Usage</div>
                  <h3>Monthly usage</h3>
                </div>
                <button className="usage-refresh" type="button" onClick={refreshUsage}>
                  {usageLoading ? "Refreshing" : "Refresh"}
                </button>
              </div>

              <div className="usage-bar">
                <div className="usage-bar-fill" style={{ width: usageBarWidth }} />
              </div>

              <div className="usage-grid">
                <div className="usage-metric">
                  <span>Remaining</span>
                  <strong>{formatNumber(usageSnapshot?.remaining_tokens)}</strong>
                </div>
                <div className="usage-metric">
                  <span>Used</span>
                  <strong>{formatNumber(usageSnapshot?.month_usage)}</strong>
                </div>
                <div className="usage-metric">
                  <span>Limit</span>
                  <strong>{formatNumber(usageSnapshot?.month_limit)}</strong>
                </div>
                <div className="usage-metric">
                  <span>Usage</span>
                  <strong>{usagePercent}</strong>
                </div>
              </div>

              <div className="usage-meta">
                Reset: {formatResetAt(usageSnapshot?.reset_at)}
              </div>
              {usageError ? <div className="usage-error">Usage error: {usageError}</div> : null}
            </section>

            <section className="api-log-card">
              <div className="api-block-label">Recent calls</div>
              {apiEntries.length === 0 ? (
                <p className="insight-empty">No request logs yet.</p>
              ) : (
                apiEntries.map((entry) => (
                  <section className="api-entry" key={entry.id}>
                    <div className="api-entry-top">
                      <span className="api-endpoint">{entry.endpoint}</span>
                      <span className={`api-status ${entry.ok ? "ok" : "error"}`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="api-time">{entry.startedAt}</div>
                    <div className="api-block">
                      <div className="api-block-label">Request</div>
                      <pre>{JSON.stringify(entry.request, null, 2)}</pre>
                    </div>
                    <div className="api-block">
                      <div className="api-block-label">Response</div>
                      <pre>{JSON.stringify(entry.response, null, 2)}</pre>
                    </div>
                  </section>
                ))
              )}
            </section>
          </div>
        </aside>
      ) : null}

      <div className="app-shell">
        <header className="topbar app-frame">
          <div className="brand-block">
            <div className="eyebrow">Decision intelligence</div>
            <h1>Decision Autopsy</h1>
          </div>

          <div className="topbar-actions">
            <button
              className={`status-chip ${liveStatus}`}
              type="button"
              onClick={() => runWithTransition(() => setShowApiPanel(true))}
            >
              <span className="status-dot" />
              {liveStatus === "online" ? "Live" : liveStatus === "offline" ? "Offline" : "Checking"}
            </button>
            {view === "chat" ? (
              <button className="ghost-btn icon-btn" type="button" onClick={closeChat} aria-label="Close chat">
                <span className="icon-plus close-mark" aria-hidden="true">×</span>
              </button>
            ) : (
              <button className="ghost-btn icon-btn" type="button" onClick={openNewChat} aria-label="New Autopsy">
                <span className="icon-plus" aria-hidden="true">+</span>
              </button>
            )}
          </div>
        </header>

        {view === "home" ? (
          <main className="home-layout screen-panel">
            <section className="home-hero app-frame">
              <div className="hero-grid">
                <div className="hero-main">
                  <div className="starter-kicker">What it does</div>
                  <div className="quote-stack">
                    {homeQuote.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                  <div className="home-actions">
                    <button className="primary-btn" type="button" onClick={openNewChat}>
                      Start a new autopsy
                    </button>
                  </div>
                </div>

                <div className="hero-side">
                  <div className="hero-note">
                    <span className="hero-note-label">Outcome</span>
                    <strong>Expose the real trade-off.</strong>
                    <p>Get past vague “maybe” thinking and surface the choice you are actually making.</p>
                  </div>
                  <div className="hero-note">
                    <span className="hero-note-label">Approach</span>
                    <strong>Interrogate the decision.</strong>
                    <p>Decision Autopsy asks what is missing, what is assumed, and what fear is shaping the answer.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="home-library app-frame">
              <div className="library-head">
                <div>
                  <div className="panel-kicker">Chats</div>
                  <h2 className="panel-title">Saved decision threads</h2>
                </div>
              </div>

              {activeSessions.length === 0 ? (
                <div className="empty-library">
                  <p>No chats yet. Start one and it will appear here.</p>
                </div>
              ) : (
                <div className="session-grid">
                  {activeSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className="session-card"
                      onClick={() => openSession(session.id)}
                    >
                      <div className="session-card-top">
                        <span className="session-card-title">{session.title}</span>
                        <span className="session-card-date">{formatUpdatedAt(session.updatedAt)}</span>
                      </div>
                      <p className="session-card-preview">{session.preview}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </main>
        ) : (
          <main className="chat-layout screen-panel">
            <section className="chat-shell app-frame">
              <div className="chat-header">
                <div>
                  <div className="panel-kicker">Decision thread</div>
                  <h2 className="chat-title">{ctx.decision || "New Autopsy"}</h2>
                  {ctx.situation_summary ? (
                    <p className="chat-subtitle">{ctx.situation_summary}</p>
                  ) : (
                    <p className="chat-subtitle">Start by describing the decision once. The system will take it from there.</p>
                  )}
                </div>
                <div className="chat-stats">
                  <span>Confidence {ctx.confidence}%</span>
                  <span>Clarity {ctx.clarity}%</span>
                  <span>{answeredCount} answered</span>
                </div>
              </div>

              <section className="messages thread-board" aria-live="polite">
                <MessageList messages={messages} isTyping={isTyping} />

                {pendingQuestion ? (
                  <QuestionCard
                    question={pendingQuestion}
                    confidence={ctx.confidence}
                    confidenceColor={getConfidenceColor(ctx.confidence)}
                    onAnswer={onQuestionAnswer}
                    onSkip={onQuestionSkip}
                  />
                ) : null}
              </section>

              <section className="composer-wrap">
                <Composer
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={onSubmitInput}
                  disabled={inputDisabled}
                  placeholder="Describe a decision you're facing..."
                />

                <div className="footer-strip">
                  <span>{missingItems.length} gaps remaining</span>
                  <span>{skippedCount} skipped</span>
                  <span>{state === "complete" ? "Listener and Questioner complete" : "Live backend connected"}</span>
                </div>
              </section>
            </section>
          </main>
        )}
      </div>
    </>
  );
}
