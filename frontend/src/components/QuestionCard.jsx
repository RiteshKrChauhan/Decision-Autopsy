import { useState } from "react";

export default function QuestionCard({ question, confidence, confidenceColor, onAnswer, onSkip }) {
  const [freeAnswer, setFreeAnswer] = useState("");

  function submitFreeAnswer() {
    const value = freeAnswer.trim();
    if (!value) return;
    onAnswer(question.id, value);
    setFreeAnswer("");
  }

  return (
    <article className="msg ai">
      <div className="bubble-wrap">
        <div className="avatar">AI</div>
        <div className="bubble">
          <p className="question-text">{question.text}</p>
          <p className="question-context">{question.context}</p>

          <div className="options">
            {question.options.map((option) => (
              <button
                className="option-card"
                type="button"
                key={option.label}
                onClick={() => onAnswer(question.id, option.label)}
              >
                <strong>{option.label}</strong>
                <small>{option.sub}</small>
              </button>
            ))}
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
              placeholder={question.own_placeholder}
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

            <button className="skip-link" type="button" onClick={() => onSkip(question.id)}>
              Skip this -&gt;
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
