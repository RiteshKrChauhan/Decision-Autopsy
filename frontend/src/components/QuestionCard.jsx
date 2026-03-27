import { useState } from "react";

export default function QuestionCard({ question, confidence, confidenceColor, onAnswer, onSkip }) {
  const [freeAnswer, setFreeAnswer] = useState("");

  function submitFreeAnswer() {
    const value = freeAnswer.trim();
    if (!value) return;
    onAnswer(question, value);
    setFreeAnswer("");
  }

  return (
    <article className="msg ai">
      <div className="bubble-wrap">
        <div className="avatar">AI</div>
        <div className="bubble question-shell">
          <div className="message-label">Question</div>
          <p className="question-text">{question.question}</p>
          <p className="question-context">{question.rationale}</p>

          <div className="question-meta-row">
            <span className="meta-pill emphasis-pill">Priority {question.priority}</span>
            <span className="meta-pill">{question.category.replaceAll("_", " ")}</span>
          </div>

          <div className="free-answer">
            <input
              type="text"
              value={freeAnswer}
              onChange={(event) => setFreeAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                submitFreeAnswer();
              }}
              placeholder="Type your answer..."
            />
            <button className="small-btn" type="button" onClick={submitFreeAnswer}>Use</button>
          </div>

          <div className="question-bottom">
            <div className="confidence-row">
              <div className="confidence-track">
                <div
                  className="confidence-fill"
                  style={{ width: `${confidence}%`, background: confidenceColor }}
                />
              </div>
              <span className="confidence-value">{confidence}%</span>
            </div>

            <button className="skip-link" type="button" onClick={() => onSkip(question)}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
