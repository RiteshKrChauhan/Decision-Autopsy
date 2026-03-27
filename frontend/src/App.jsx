import { useEffect, useMemo, useRef, useState } from "react";
import {
  getApiUsage,
  getBackendHealth,
  runListener,
  runPatternReader,
  runQuestioner,
  runSurgeon,
  runCompanion,
  subscribeToApiDebug,
} from "./services/apiClient.js";
import { createInitialContext } from "./state/context.js";
import MessageList from "./components/MessageList.jsx";
import QuestionCard from "./components/QuestionCard.jsx";
import Composer from "./components/Composer.jsx";
import FuturesPanel from "./components/FuturesPanel.jsx";

const STORAGE_KEY = "decision-autopsy-sessions-v2";
const MAX_INTAKE_STEPS = 3;
const MIN_ANSWERED_BEFORE_HANDOFF = 2;
const QUESTION_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "your", "you", "are", "have",
  "will", "would", "what", "when", "where", "which", "why", "from", "into",
  "about", "than", "them", "they", "their", "then", "just", "does", "did",
  "has", "had", "how", "can", "could", "should", "been", "being", "want",
]);

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
    analysisStage: "",
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
      analysisStage: item.analysisStage ?? "",
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
    pattern_analysis: ctx.pattern_analysis,
    autopsy: ctx.autopsy,
  };
}

function normalizeQuestionRecord(question, answer) {
  return {
    question_id: question.question_id,
    question: question.question,
    priority: question.priority,
    category: question.category,
    rationale: question.rationale,
    answer,
  };
}

function normalizeQuestionText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuestion(value) {
  return normalizeQuestionText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !QUESTION_STOP_WORDS.has(token));
}

function isSameQuestion(left, right) {
  const normalizedLeft = normalizeQuestionText(left);
  const normalizedRight = normalizeQuestionText(right);

  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return true;
  }

  const leftTokens = new Set(tokenizeQuestion(left));
  const rightTokens = new Set(tokenizeQuestion(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const denominator = Math.max(leftTokens.size, rightTokens.size);
  return denominator > 0 && overlap / denominator >= 0.7;
}

function dedupeQuestions(questions, ctx, pendingQuestion) {
  const seenQuestions = [
    ...ctx.question_history.map((item) => item.question),
    ...ctx.active_questions.map((item) => item.question),
    pendingQuestion?.question,
  ].filter(Boolean);

  const fresh = [];

  for (const question of questions) {
    const isKnown = seenQuestions.some((item) => isSameQuestion(item, question.question));
    const isDuplicateInBatch = fresh.some((item) => isSameQuestion(item.question, question.question));
    const wasSkipped = ctx.skipped.includes(question.question_id);

    if (isKnown || isDuplicateInBatch || wasSkipped) {
      continue;
    }

    fresh.push(question);
  }

  return fresh;
}

function shouldCompleteIntake(nextCtx, freshQuestions) {
  const answeredQuestions = nextCtx.question_history.filter((item) => item.answer);
  const answeredCount = answeredQuestions.length;
  const resolvedCount = nextCtx.question_history.length;
  const answeredCategories = new Set(
    answeredQuestions
      .map((item) => item.category)
      .filter(Boolean)
  );
  const hasFinancialCoverage = answeredQuestions.some((item) => {
    const category = String(item.category || "").toLowerCase();
    return category.includes("financial");
  });
  const hasIntentCoverage = answeredQuestions.some((item) => {
    const category = String(item.category || "").toLowerCase();
    const question = String(item.question || "").toLowerCase();
    return (
      category.includes("emotional") ||
      category.includes("motivation") ||
      category.includes("goal") ||
      category.includes("intent") ||
      question.includes("why") ||
      question.includes("what need") ||
      question.includes("trying to solve") ||
      question.includes("matters more") ||
      question.includes("fear") ||
      question.includes("regret") ||
      question.includes("what are you optimizing for") ||
      question.includes("what specific outcome")
    );
  });
  const hasEnoughSignal = hasIntentCoverage || hasFinancialCoverage || answeredCategories.size >= 2;

  if (resolvedCount >= MAX_INTAKE_STEPS) {
    return true;
  }

  if (
    answeredCount >= MIN_ANSWERED_BEFORE_HANDOFF &&
    freshQuestions.length === 0 &&
    hasEnoughSignal
  ) {
    return true;
  }

  if (
    answeredCount >= MIN_ANSWERED_BEFORE_HANDOFF &&
    hasIntentCoverage &&
    hasEnoughSignal
  ) {
    return true;
  }

  return false;
}

function hasAnsweredCategory(ctx, matcher) {
  return ctx.question_history.some(
    (item) => item.answer && matcher(String(item.category || "").toLowerCase(), String(item.question || "").toLowerCase())
  );
}

function buildFallbackQuestion(ctx) {
  const hasFinancial = hasAnsweredCategory(ctx, (category) => category.includes("financial"));
  const hasPractical = hasAnsweredCategory(
    ctx,
    (category, question) => category.includes("practical") || question.includes("current situation") || question.includes("timeline")
  );
  const hasIntent = hasAnsweredCategory(
    ctx,
    (category, question) =>
      category.includes("emotional") ||
      category.includes("motivation") ||
      category.includes("goal") ||
      category.includes("intent") ||
      question.includes("what matters more") ||
      question.includes("trying to solve") ||
      question.includes("what need") ||
      question.includes("optimizing for")
  );

  const fallbackCandidates = [
    !hasFinancial
      ? {
          question_id: "fallback-financial",
          question: "How many months could you support yourself if this decision reduced your income?",
          priority: "critical",
          category: "financial_reality",
          rationale: "This decision cannot be judged well until your financial runway is clear.",
          answer_choices: ["Less than 3 months", "3-6 months", "6-12 months", "More than 12 months"],
        }
      : null,
    !hasPractical
      ? {
          question_id: "fallback-practical",
          question: "What is your real situation right now: stable, stuck, or under pressure to change something soon?",
          priority: "high",
          category: "practical_constraints",
          rationale: "The next step depends on whether this is a calm decision or a time-sensitive one.",
          answer_choices: ["Stable right now", "Stuck but manageable", "Need change soon", "Already under pressure"],
        }
      : null,
    !hasIntent
      ? {
          question_id: "fallback-intent",
          question: "What matters more in this decision right now?",
          priority: "critical",
          category: "desired_outcome",
          rationale: "Until the real priority is named, the decision keeps pretending to be about surface details.",
          answer_choices: ["More stability", "More freedom", "Less financial strain", "Less regret later"],
        }
      : {
          question_id: "fallback-fear",
          question: "What feels worse to you three years from now?",
          priority: "high",
          category: "emotional_risk",
          rationale: "This exposes whether you are optimizing for safety, freedom, or regret avoidance.",
          answer_choices: ["Trying and failing", "Never trying", "Choosing too early", "Choosing too late"],
        },
  ].filter(Boolean);

  return fallbackCandidates[0] ?? null;
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

function formatFocusLabel(value) {
  if (!value) return "intake";
  return value.replaceAll("_", " ");
}

function toSentenceCase(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function makePersonalSummary(output) {
  const summary = (output?.situation_summary || "").trim();
  const missing = Array.isArray(output?.missing_information) ? output.missing_information : [];

  let direct = summary
    .replace(/^User is\b/i, "You are")
    .replace(/^User has\b/i, "You have")
    .replace(/^User appears to be\b/i, "You seem to be")
    .replace(/^User seems to be\b/i, "You seem to be")
    .replace(/\bthe user\b/gi, "you");

  if (!direct) {
    direct = "You have started the thread, but I still need more context before I can help properly.";
  }

  const topMissing = missing.slice(0, 3).map((item) => toSentenceCase(String(item)));
  if (topMissing.length === 0) {
    return direct;
  }

  return `${direct} What I still need most is ${topMissing.join(", ")}.`;
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
  const [quoteIndex, setQuoteIndex] = useState(0);
  const threadBoardRef = useRef(null);

  const ctx = currentSession?.ctx ?? createInitialContext();
  const messages = currentSession?.messages ?? [];
  const pendingQuestion = currentSession?.pendingQuestion ?? null;
  const state = currentSession?.state ?? "idle";
  const isTyping = currentSession?.isTyping ?? false;
  const analysisStage = currentSession?.analysisStage ?? "";
  const inputDisabled = ["parsing", "questioning", "analysis", "companion"].includes(state);
  const answeredCount = ctx.question_history.filter((item) => item.answer).length;
  const skippedCount = ctx.skipped.length;
  const missingItems = ctx.listener_result?.missing_information ?? [];
  const startedDecision = Boolean(ctx.decision);
  const activeQuestionCount = ctx.active_questions.length;
  const totalProgressCount = answeredCount + skippedCount + (pendingQuestion ? 1 : 0);
  const totalQuestionFlow = answeredCount + skippedCount + activeQuestionCount + (pendingQuestion ? 1 : 0);
  const questionProgressPercent = totalQuestionFlow > 0
    ? Math.max(8, Math.round(((answeredCount + skippedCount) / totalQuestionFlow) * 100))
    : 0;
  const stageLabel = !startedDecision
    ? "intake"
    : pendingQuestion
      ? "questioning"
      : state === "complete"
        ? "listener + questioner complete"
        : state;
  const activeSessions = useMemo(
    () => [...sessions].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)),
    [sessions]
  );
  const chatTitle = ctx.decision || "New decision";
  const futures = Array.isArray(ctx.autopsy?.futures) ? ctx.autopsy.futures : [];
  const hasFutures = futures.length === 4;

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

  useEffect(() => {
    if (view !== "home") return undefined;

    const timer = setInterval(() => {
      setQuoteIndex((current) => (current + 1) % 3);
    }, 3200);

    return () => clearInterval(timer);
  }, [view]);

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

  function deleteSession(sessionId) {
    setSessions((previous) => previous.filter((item) => item.id !== sessionId));

    if (currentSession?.id === sessionId) {
      runWithTransition(() => {
        setCurrentSession(null);
        setInputValue("");
        setView("home");
      });
    }
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
        analysisStage: "",
      }));
      addMessage("error", "The live backend request failed. Check the backend server and try again.");
      return null;
    }
  }

  async function finalizeIntake(nextCtx) {
    updateCurrentSession((current) => ({
      ...current,
      isTyping: true,
      state: "analysis",
      analysisStage: "Reading your answers and finding the real pattern.",
      pendingQuestion: null,
      ctx: {
        ...nextCtx,
        active_questions: [],
      },
    }));

    const response = await safeRequest(() => (
      runPatternReader(buildBackendContext(nextCtx), "Identify the strongest pattern in how I am framing this decision so far.")
    ));

    if (!response) {
      updateCurrentSession((current) => ({
        ...current,
        isTyping: false,
        state: "complete",
        analysisStage: "",
        pendingQuestion: null,
        ctx: {
          ...current.ctx,
          active_questions: [],
        },
      }));
      return;
    }

    const patternCtx = {
      ...nextCtx,
      pattern_analysis: {
        ...nextCtx.pattern_analysis,
        observation: response.output.observation,
        sub: response.output.sub,
      },
    };

    updateCurrentSession((current) => ({
      ...current,
      isTyping: true,
      state: "analysis",
      analysisStage: "Pattern found. Building the futures now.",
      pendingQuestion: null,
      ctx: {
        ...current.ctx,
        active_questions: [],
        pattern_analysis: patternCtx.pattern_analysis,
      },
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "system",
          content: response.output.observation,
          muted: response.output.sub,
        },
      ],
    }));

    const surgeonResponse = await safeRequest(() => (
      runSurgeon(buildBackendContext(patternCtx), "Generate the four futures, the fork point, and the one action to take.")
    ));

    if (!surgeonResponse) {
      updateCurrentSession((current) => ({
        ...current,
        isTyping: false,
        state: "complete",
        analysisStage: "",
        pendingQuestion: null,
        ctx: {
          ...current.ctx,
          active_questions: [],
        },
      }));
      return;
    }

    const autopsyCtx = {
      ...patternCtx,
      autopsy: {
        timeline_ready: true,
        summary: surgeonResponse.output.fork_point.body,
        futures: surgeonResponse.output.futures,
        fork_point: surgeonResponse.output.fork_point,
      },
    };

    updateCurrentSession((current) => ({
      ...current,
      isTyping: false,
      state: "complete",
      analysisStage: "",
      pendingQuestion: null,
      ctx: {
        ...current.ctx,
        active_questions: [],
        pattern_analysis: autopsyCtx.pattern_analysis,
        autopsy: autopsyCtx.autopsy,
      },
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: "Your futures are ready. Read them together before you decide what to do next.",
          muted: autopsyCtx.autopsy.fork_point.action || null,
        },
      ],
    }));
  }

  async function fetchQuestions(nextCtx, prompt) {
    updateCurrentSession((current) => ({
      ...current,
      isTyping: true,
      state: "questioning",
      analysisStage: "",
      ctx: nextCtx,
    }));

    const response = await safeRequest(() => runQuestioner(buildBackendContext(nextCtx), prompt));
    if (!response) return;

    const proposedQuestions = response.output.questions ?? [];
    let questions = dedupeQuestions(proposedQuestions, nextCtx, pendingQuestion);

    if (shouldCompleteIntake(nextCtx, questions)) {
      await finalizeIntake(nextCtx);
      return;
    }

    if (questions.length === 0) {
      const retryResponse = await safeRequest(() => (
        runQuestioner(
          buildBackendContext(nextCtx),
          "Ask exactly one next unanswered question. Do not stop early. Ask one direct question that moves the decision forward."
        )
      ));

      if (retryResponse) {
        questions = dedupeQuestions(retryResponse.output.questions ?? [], nextCtx, pendingQuestion);
      }
    }

    if (questions.length === 0 && !shouldCompleteIntake(nextCtx, [])) {
      const fallbackQuestion = buildFallbackQuestion(nextCtx);
      if (fallbackQuestion) {
        questions = [fallbackQuestion];
      }
    }

    const nextQuestion = questions[0] ?? null;

    updateCurrentSession((current) => ({
      ...current,
      isTyping: false,
      state: nextQuestion ? "questioning" : "complete",
      analysisStage: "",
      pendingQuestion: nextQuestion,
      ctx: {
        ...current.ctx,
        active_questions: questions,
      },
      messages: current.messages,
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
      analysisStage: "",
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
      situation_summary: makePersonalSummary(listenerOutput),
      listener_result: listenerOutput,
    };

    updateCurrentSession((current) => ({
      ...current,
      isTyping: false,
      state: "idle",
      analysisStage: "",
      ctx: parsedCtx,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: makePersonalSummary(listenerOutput),
          muted: listenerOutput.emotional_signals?.length
            ? `I can already sense ${listenerOutput.emotional_signals.join(", ")} here.`
            : null,
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
          context: question.question,
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

    if (shouldCompleteIntake(nextCtx, [])) {
      await finalizeIntake(nextCtx);
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
      messages: current.messages,
    }));

    const nextQuestion = nextCtx.active_questions[0] ?? null;
    if (nextQuestion) {
      updateCurrentSession((current) => ({
        ...current,
        pendingQuestion: nextQuestion,
      }));
      return;
    }

    if (shouldCompleteIntake(nextCtx, [])) {
      await finalizeIntake(nextCtx);
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

    if (!hasFutures) {
      addMessage("error", "Use the active question card below while intake is still running.");
      return;
    }

    addMessage("user", value);
    updateCurrentSession((current) => ({
      ...current,
      isTyping: true,
      state: "companion",
      analysisStage: "",
    }));

    const response = await safeRequest(() => (
      runCompanion(buildBackendContext(ctx), value)
    ));
    if (!response) return;

    updateCurrentSession((current) => ({
      ...current,
      isTyping: false,
      state: "complete",
      analysisStage: "",
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "ai",
          content: response.output.reply,
        },
      ],
    }));
  }

  const usagePercent = usageSnapshot?.percentage || "0%";
  const usageBarWidth = typeof usageSnapshot?.month_usage === "number" &&
    typeof usageSnapshot?.month_limit === "number" &&
    usageSnapshot.month_limit > 0
    ? `${Math.min((usageSnapshot.month_usage / usageSnapshot.month_limit) * 100, 100)}%`
    : "0%";

  const homeQuote = useMemo(() => [
    "The clearest decisions usually begin with the right question.",
    "What feels confusing gets sharper when the trade-off is named.",
    "Clarity starts when the decision stops hiding behind noise.",
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
            <section className="home-unified app-frame">
              <section className="home-library">
                <div className="library-head">
                  <div>
                    <h2 className="panel-title">Previous Chats</h2>
                  </div>
                </div>

                {activeSessions.length === 0 ? (
                  <div className="empty-library">
                    <p>No chats yet. Start one and it will appear here.</p>
                  </div>
                ) : (
                  <div className="session-grid single-column">
                    {activeSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className="session-card"
                      onClick={() => openSession(session.id)}
                    >
                      <div className="session-card-top">
                        <span className="session-card-title">{session.title}</span>
                        <button
                          type="button"
                          className="session-delete-btn"
                          aria-label={`Delete ${session.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          <span className="trash-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                              <path d="M9 3.75h6a1 1 0 0 1 1 1V6h3a.75.75 0 0 1 0 1.5h-1.02l-.77 10.03A2.5 2.5 0 0 1 14.72 20H9.28a2.5 2.5 0 0 1-2.49-2.47L6.02 7.5H5a.75.75 0 0 1 0-1.5h3V4.75a1 1 0 0 1 1-1Zm5.5 2.25v-.75h-5V6h5ZM8.29 7.5l.75 9.92a1 1 0 0 0 1 .98h4a1 1 0 0 0 1-.98l.75-9.92H8.29ZM10.75 10a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    </button>
                  ))}
                  </div>
                )}
              </section>

              <section className="home-hero simple-home-hero">
                <div className="hero-main">
                  <div className="starter-kicker">Decision Autopsy</div>
                  <h2 className="hero-title">Start with one real decision.</h2>
                  <div className="quote-stack">
                    <p key={homeQuote[quoteIndex]} className="hero-quote-rotating hero-quote-strong">
                      {homeQuote[quoteIndex]}
                    </p>
                  </div>
                  <div className="home-actions">
                    <button className="primary-btn primary-btn-futuristic" type="button" onClick={openNewChat}>
                      Start a new autopsy
                    </button>
                  </div>
                </div>
              </section>
            </section>
          </main>
        ) : (
          <main className="chat-layout screen-panel">
            <section className="chat-shell chat-shell-wide app-frame">
              <div className="chat-shell-header simple-chat-header">
                <h2 className="panel-title chat-panel-title">{startedDecision ? chatTitle : "Start a new decision"}</h2>
              </div>

              <section className="messages thread-board" aria-live="polite" ref={threadBoardRef}>
                <MessageList
                  messages={messages}
                  isTyping={isTyping}
                  scrollContainerRef={threadBoardRef}
                />

                {pendingQuestion ? (
                  <QuestionCard
                    key={pendingQuestion.question_id}
                    question={pendingQuestion}
                    progressPercent={questionProgressPercent}
                    progressLabel={`${answeredCount + skippedCount} done`}
                    questionLabel={`Question ${answeredCount + skippedCount + 1}`}
                    onAnswer={onQuestionAnswer}
                    onSkip={onQuestionSkip}
                  />
                ) : null}

                {state === "analysis" && !hasFutures ? (
                  <section className="analysis-card">
                    <div className="question-step">Building your decision branches</div>
                    <h3 className="analysis-title">Moving from intake to futures</h3>
                    <p className="analysis-copy">
                      {analysisStage || "Reading your answers, finding the pattern, and generating the futures."}
                    </p>
                  </section>
                ) : null}

                {hasFutures ? (
                  <FuturesPanel
                    futures={futures}
                    forkPoint={ctx.autopsy?.fork_point}
                  />
                ) : null}
              </section>

              {!startedDecision || hasFutures ? (
                <section className="composer-wrap">
                  <Composer
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={onSubmitInput}
                    disabled={inputDisabled}
                    placeholder={!startedDecision ? "Describe a decision you're facing..." : "Ask a follow-up about these futures..."}
                  />
                </section>
              ) : (
                <div className="chat-bottom-spacer" />
              )}
            </section>
          </main>
        )}
      </div>
    </>
  );
}
