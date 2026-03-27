import { useMemo, useState } from "react";
import { post } from "./services/apiClient.js";
import { createInitialContext } from "./state/context.js";
import FuturesGrid from "./components/FuturesGrid.jsx";
import MessageList from "./components/MessageList.jsx";
import QuestionCard from "./components/QuestionCard.jsx";
import Composer from "./components/Composer.jsx";

const suggestionChips = [
  "Which path has the least regret in 2 years?",
  "What assumptions should I test this week?",
  "What would make this decision reversible?",
];

function getConfidenceColor(value) {
  if (value >= 70) return "#2DD68A";
  if (value >= 45) return "#E6A830";
  return "#5A8DF0";
}

export default function App() {
  const [ctx, setCtx] = useState(createInitialContext());
  const [messages, setMessages] = useState([]);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [state, setState] = useState("idle");
  const [isTyping, setIsTyping] = useState(false);
  const [expandedTileId, setExpandedTileId] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [showRerunBanner, setShowRerunBanner] = useState(false);

  const inputDisabled = ["parsing", "questioning", "generating", "chatting"].includes(state);
  const hasConversationStarted = messages.length > 0 || Boolean(pendingQuestion) || ctx.futures.length > 0 || isTyping;

  const headerMeta = useMemo(() => {
    if (!ctx.decision) return "Demo mode active with mocked JSON responses.";
    return `Confidence ${ctx.confidence}% · Domain ${ctx.domain || "unknown"}`;
  }, [ctx.confidence, ctx.decision, ctx.domain]);

  function addMessage(type, content, extra = {}) {
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        content,
        ...extra,
      },
    ]);
  }

  function resetAll() {
    setCtx(createInitialContext());
    setMessages([]);
    setPendingQuestion(null);
    setQuestionNumber(1);
    setState("idle");
    setIsTyping(false);
    setExpandedTileId(null);
    setInputValue("");
    setShowRerunBanner(false);
  }

  async function safeRequest(action) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      setIsTyping(false);
      setState("error");
      addMessage("error", "Something went wrong. Please try again.");
      return null;
    }
  }

  async function runFutures(nextCtx) {
    setState("generating");
    setIsTyping(true);

    const result = await safeRequest(() => post("/futures", nextCtx));
    if (!result) return;

    setIsTyping(false);

    const updatedCtx = {
      ...nextCtx,
      bias_note: result.bias_note,
      futures: result.futures,
      fork_point: result.fork_point,
    };

    setCtx(updatedCtx);
    addMessage("system", result.bias_note, { sub: result.pattern_sub });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    addMessage("ai", "Running your autopsy now...");

    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsTyping(false);

    setState("futures-shown");
  }

  async function askNextQuestion(nextCtx, nextQNum) {
    setState("questioning");
    setIsTyping(true);

    const result = await safeRequest(() => post("/question", { ...nextCtx, question_number: nextQNum }));
    if (!result) return;

    setIsTyping(false);

    if (result.done) {
      const doneCtx = {
        ...nextCtx,
        confidence: typeof result.confidence === "number" ? result.confidence : nextCtx.confidence,
      };
      setCtx(doneCtx);
      await runFutures(doneCtx);
      return;
    }

    setCtx((current) => ({ ...current, confidence: result.confidence }));
    setPendingQuestion(result.question);
    setQuestionNumber(nextQNum);
  }

  async function startDecision(text) {
    setState("parsing");
    setIsTyping(true);

    const baseCtx = { ...ctx, decision: text };
    setCtx(baseCtx);
    addMessage("user", text);

    const parsed = await safeRequest(() => post("/parse", { decision: text }));
    if (!parsed) return;

    setIsTyping(false);

    const parsedCtx = {
      ...baseCtx,
      ...parsed,
    };

    setCtx(parsedCtx);

    if (!parsedCtx.ask_questions) {
      await runFutures(parsedCtx);
      return;
    }

    await askNextQuestion(parsedCtx, 1);
  }

  async function onQuestionAnswer(questionId, answer) {
    if (!pendingQuestion) return;

    const updatedCtx = {
      ...ctx,
      answers: {
        ...ctx.answers,
        [questionId]: answer,
      },
    };

    setCtx(updatedCtx);
    setPendingQuestion(null);

    addMessage("ai", `Question ${questionId}`,
      { muted: answer ? `Your answer: ${answer}` : "Skipped" }
    );

    const nextQ = questionNumber + 1;
    setQuestionNumber(nextQ);
    await askNextQuestion(updatedCtx, nextQ);
  }

  async function onQuestionSkip(questionId) {
    if (!pendingQuestion) return;

    const updatedCtx = {
      ...ctx,
      answers: {
        ...ctx.answers,
        [questionId]: null,
      },
      skipped: [...ctx.skipped, questionId],
    };

    setCtx(updatedCtx);
    setPendingQuestion(null);

    addMessage("ai", `Question ${questionId}`, { muted: "Skipped" });

    const nextQ = questionNumber + 1;
    setQuestionNumber(nextQ);
    await askNextQuestion(updatedCtx, nextQ);
  }

  async function continueChat(message) {
    setState("chatting");
    setIsTyping(true);

    const nextHistory = [...ctx.chat_history, { role: "user", content: message }];
    const nextCtx = { ...ctx, chat_history: nextHistory };

    setCtx(nextCtx);
    addMessage("user", message);

    const result = await safeRequest(() => post("/chat", { ...nextCtx, message }));
    if (!result) return;

    setIsTyping(false);

    const finalCtx = {
      ...nextCtx,
      chat_history: [...nextHistory, { role: "assistant", content: result.reply }],
    };

    setCtx(finalCtx);
    addMessage("ai", result.reply);

    if (result.rerun) {
      setState("rerun");
      setShowRerunBanner(true);
      return;
    }

    setShowRerunBanner(false);
    setState("futures-shown");
  }

  async function onSubmitInput(text) {
    const value = text.trim();
    if (!value || inputDisabled) return;

    setInputValue("");

    if (!ctx.decision) {
      await startDecision(value);
      return;
    }

    await continueChat(value);
  }

  async function onRerun() {
    setShowRerunBanner(false);
    await runFutures(ctx);
  }

  return (
    <>
      <div className="bg-glow bg-glow-left" />
      <div className="bg-glow bg-glow-right" />

      <div className="app-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Decision Intelligence</div>
            <h1>Decision Autopsy</h1>
            <p className="subtitle">See every road before you take one.</p>
          </div>
          <button className="ghost-btn" type="button" onClick={resetAll}>New Autopsy</button>
        </header>

        {hasConversationStarted ? (
          <main className="workspace">
            <section className="messages" aria-live="polite">
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

              {ctx.futures.length > 0 ? (
                <section className="futures-wrap">
                  <FuturesGrid
                    futures={ctx.futures}
                    expandedTileId={expandedTileId}
                    setExpandedTileId={setExpandedTileId}
                    forkPoint={ctx.fork_point}
                    chips={suggestionChips}
                    onChipClick={(chip) => setInputValue(chip)}
                  />
                </section>
              ) : null}
            </section>
          </main>
        ) : (
          <section className="starter-panel">
            <div className="starter-kicker">Start with one real decision</div>
            <h2>Type your situation below and press Send.</h2>
            <p>Your AI autopsy chat appears after your first message.</p>
          </section>
        )}

        <section className="composer-wrap">
          {showRerunBanner ? (
            <div className="rerun-banner">
              <span>That changes things. Regenerate futures?</span>
              <button id="rerunBtn" type="button" onClick={onRerun}>Regenerate</button>
            </div>
          ) : null}

          <Composer
            value={inputValue}
            onChange={setInputValue}
            onSubmit={onSubmitInput}
            disabled={inputDisabled}
            placeholder="Describe a decision you're facing..."
          />

          <p className="hint">{headerMeta}</p>
        </section>
      </div>
    </>
  );
}
