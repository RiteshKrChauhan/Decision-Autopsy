import { useEffect, useState } from "react";

function inferQuickReplies(question) {
  if (Array.isArray(question.answer_choices) && question.answer_choices.length > 0) {
    return question.answer_choices;
  }

  const questionText = `${question.question || ""}`.toLowerCase().trim();
  const category = `${question.category || ""}`.toLowerCase();
  const rationale = `${question.rationale || ""}`.toLowerCase();

  if (questionText.includes(", and ") || questionText.includes("? are ") || questionText.includes("? do ")) {
    return [];
  }

  if (questionText.startsWith("how long have you been")) {
    return ["Less than 1 year", "1-3 years", "More than 3 years"];
  }

  if (
    questionText.includes("currently employed") ||
    questionText.includes("fresh graduate") ||
    questionText.includes("job offer in hand")
  ) {
    return ["Working now", "Fresh graduate", "Offer in hand"];
  }

  if (
    questionText.includes("monthly income") ||
    questionText.includes("take-home income") ||
    questionText.includes("salary") ||
    questionText.includes("survive with zero income") ||
    questionText.includes("financial support situation")
  ) {
    if (
      questionText.includes("monthly income") ||
      questionText.includes("take-home income") ||
      questionText.includes("salary")
    ) {
      return ["Below INR 30,000/month", "INR 30,000-75,000/month", "Above INR 75,000/month"];
    }
    return ["Less than 3 months", "3-6 months", "More than 6 months"];
  }

  if (
    questionText.includes("current age") ||
    questionText.includes("educational qualification") ||
    questionText.includes("degree, field, graduation year")
  ) {
    return [];
  }

  if (
    questionText.includes("savings") &&
    questionText.includes("family support") &&
    questionText.includes("take loans")
  ) {
    return ["Family support available", "Some savings", "Would need a loan"];
  }

  if (
    questionText.includes("partner want to get married") ||
    questionText.includes("same timeline")
  ) {
    return ["Same timeline", "Different timeline", "Not discussed clearly"];
  }

  if (
    questionText.includes("live with") ||
    questionText.includes("with parents") ||
    questionText.includes("renting") ||
    questionText.includes("own place")
  ) {
    return ["With parents", "Renting now", "Own place"];
  }

  if (
    category === "financial_reality" &&
    (questionText.includes("savings") || rationale.includes("runway"))
  ) {
    if (questionText.includes("how much") || questionText.includes("saved")) {
      return ["Under INR 1 lakh", "INR 1-5 lakh", "Above INR 5 lakh"];
    }
    return ["No savings", "Some savings", "Strong runway"];
  }

  if (
    category === "financial_reality" &&
    (questionText.includes("loan") || questionText.includes("debt"))
  ) {
    return ["No major EMIs", "Manageable EMIs", "Heavy debt pressure"];
  }

  if (
    category === "practical_constraints" &&
    (questionText.includes("timeline") || questionText.includes("when"))
  ) {
    return ["Within 3 months", "3-12 months", "More than 1 year"];
  }

  if (
    category === "practical_constraints" &&
    (questionText.includes("attempt") || questionText.includes("preparation stage"))
  ) {
    return ["Just starting", "Already preparing", "Tried before"];
  }

  if (
    category === "emotional_risk" &&
    (questionText.includes("fear") || questionText.includes("worst thing"))
  ) {
    return ["Fear of failure", "Fear of regret", "Fear of instability"];
  }

  return [];
}

export default function QuestionCard({
  question,
  questionLabel,
  progressPercent,
  progressLabel,
  onAnswer,
  onSkip,
}) {
  const [freeAnswer, setFreeAnswer] = useState("");
  const quickReplies = inferQuickReplies(question);

  useEffect(() => {
    setFreeAnswer("");
  }, [question.question_id]);

  function submitFreeAnswer() {
    const value = freeAnswer.trim();
    if (!value) return;
    onAnswer(question, value);
    setFreeAnswer("");
  }

  function submitQuickReply(value) {
    onAnswer(question, value);
    setFreeAnswer("");
  }

  return (
    <article className="msg ai">
      <div className="bubble-wrap">
        <div className="avatar" aria-hidden="true" />
        <div className="bubble question-shell">
          <div className="question-head">
            <div className="question-step">{questionLabel || "Next question"}</div>
            <div className="question-progress-text">{progressLabel || ""}</div>
          </div>
          <p className="question-text">{question.question}</p>
          <p className="question-context">{question.rationale}</p>

          {quickReplies.length > 0 ? (
            <div className="option-list">
              {quickReplies.map((item, index) => (
                <button
                  key={item}
                  className="option-row"
                  type="button"
                  onClick={() => submitQuickReply(item)}
                >
                  <span className="option-index">{index + 1}</span>
                  <span className="option-copy">{item}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="custom-answer-row">
            <div className="custom-answer-input">
              <span className="custom-answer-icon" aria-hidden="true">✎</span>
              <input
                type="text"
                value={freeAnswer}
                onChange={(event) => setFreeAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  submitFreeAnswer();
                }}
                placeholder="Something else"
              />
            </div>
            <button className="skip-cta" type="button" onClick={() => onSkip(question)}>
              Skip
            </button>
          </div>

          <div className="question-bottom">
            <div className="confidence-row">
              <div className="confidence-track">
                <div
                  className="confidence-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="confidence-value">{progressPercent}%</span>
            </div>

            <button className="small-btn" type="button" onClick={submitFreeAnswer}>
              Use
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
