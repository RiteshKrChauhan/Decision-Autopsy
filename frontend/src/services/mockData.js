const QUESTION_BANK = [
  {
    id: "q1",
    text: "What are you really deciding between right now?",
    context: "Naming the true fork reduces vague anxiety and increases clarity.",
    options: [
      { label: "Quit now", sub: "full commitment" },
      { label: "Stay 1 year", sub: "de-risked runway" },
      { label: "Hybrid transition", sub: "split focus" },
    ],
    own_placeholder: "Or describe the two paths in your own words...",
    confidence: 36,
  },
  {
    id: "q2",
    text: "What does your financial runway look like?",
    context: "Runway changes pressure, decision quality, and the cost of mistakes.",
    options: [
      { label: "Under 3 months", sub: "high pressure" },
      { label: "3 to 8 months", sub: "tight but workable" },
      { label: "Over 8 months", sub: "comfortable window" },
    ],
    own_placeholder: "Or describe your exact runway situation...",
    confidence: 58,
  },
  {
    id: "q3",
    text: "How clear is the problem you are solving?",
    context: "Problem clarity predicts whether effort compounds or gets wasted.",
    options: [
      { label: "Very clear", sub: "validated pain" },
      { label: "Somewhat clear", sub: "still testing" },
      { label: "Unclear", sub: "exploratory stage" },
    ],
    own_placeholder: "Describe what you know from users so far...",
    confidence: 74,
  },
  {
    id: "q4",
    text: "What failure would hurt you the most in 12 months?",
    context: "This reveals your hidden values and regret profile.",
    options: [
      { label: "Trying and failing", sub: "financial hit" },
      { label: "Not trying", sub: "identity regret" },
      { label: "Burnout", sub: "health + relationships" },
    ],
    own_placeholder: "Write your biggest fear in one sentence...",
    confidence: 88,
  },
];

const SCENARIO_LIBRARY = {
  career: {
    bias_note:
      "You framed this mostly through downside risk. The upside story never got equal attention.",
    pattern_sub: "The futures below force equal weight on risk and opportunity.",
    fork_point: {
      body: "The highest leverage variable is reaching first paying users before runway anxiety dominates.",
      action: "Interview 5 target users this week and validate one painful workflow before building features.",
    },
    futures: [
      {
        id: "f1",
        color: "#2DD68A",
        label: "If it works",
        title: "You leave now and find early product traction.",
        summary: "Revenue appears by month 5 and stress starts to normalize by year 1.",
        confidence: 52,
        risk_score: 38,
        risk_level: "low",
        upside_score: 82,
        regret_score: 29,
        volatility: "medium",
        time_horizon: "6-18 months",
        path_type: "aggressive",
        key_assumption: "Users will pay for speed and not just novelty.",
        events: [
          {
            when: "Month 2",
            what: "You ship a tighter offer",
            note: "A narrower audience converts faster than expected.",
          },
          {
            when: "Month 5",
            what: "First recurring customers",
            note: "Momentum replaces uncertainty in day-to-day decisions.",
          },
          {
            when: "Year 1",
            what: "$9k MRR milestone",
            note: "You cross survival mode and can plan deliberately.",
          },
          {
            when: "Year 3",
            what: "Strategic acquisition interest",
            note: "Optionality appears where none existed before.",
          },
        ],
      },
      {
        id: "f2",
        color: "#E6A830",
        label: "If it struggles",
        title: "You leave now but growth is slower than planned.",
        summary: "You gain clarity but spend runway quickly and must adjust your model.",
        confidence: 68,
        risk_score: 71,
        risk_level: "high",
        upside_score: 57,
        regret_score: 46,
        volatility: "high",
        time_horizon: "3-12 months",
        path_type: "fragile",
        key_assumption: "You can buy enough learning before cash pressure spikes.",
        events: [
          {
            when: "Month 1",
            what: "Launch misses expected conversion",
            note: "Messaging and segment mismatch become obvious.",
          },
          {
            when: "Month 4",
            what: "Budget pressure increases",
            note: "You pause optional expenses and simplify roadmap.",
          },
          {
            when: "Month 7",
            what: "Freelance bridge added",
            note: "Cashflow recovers but focus gets fragmented.",
          },
          {
            when: "Year 1",
            what: "Strategic pivot",
            note: "Lessons are expensive, but they become durable assets.",
          },
        ],
      },
      {
        id: "f3",
        color: "#5A8DF0",
        label: "If you wait",
        title: "You stay employed while building intentionally at night.",
        summary: "Progress is slower, but financial pressure stays controlled.",
        confidence: 61,
        risk_score: 49,
        risk_level: "medium",
        upside_score: 65,
        regret_score: 43,
        volatility: "low",
        time_horizon: "12-24 months",
        path_type: "measured",
        key_assumption: "Consistency remains strong despite part-time constraints.",
        events: [
          {
            when: "Month 3",
            what: "Steady customer discovery",
            note: "Pattern confidence rises with lower panic.",
          },
          {
            when: "Month 8",
            what: "Offer becomes clearer",
            note: "You now know what to cut and what to double down on.",
          },
          {
            when: "Year 1",
            what: "Planned transition window",
            note: "You move with runway and proof instead of hope.",
          },
          {
            when: "Year 2",
            what: "Compounding growth",
            note: "The patient path creates fewer recovery costs.",
          },
        ],
      },
      {
        id: "f4",
        color: "#9A9890",
        label: "If nothing changes",
        title: "You postpone the decision and maintain the status quo.",
        summary: "Short-term comfort rises, but long-term regret accumulates quietly.",
        confidence: 73,
        risk_score: 66,
        risk_level: "high",
        upside_score: 33,
        regret_score: 79,
        volatility: "low",
        time_horizon: "18-36 months",
        path_type: "default",
        key_assumption: "Avoiding action remains emotionally tolerable.",
        events: [
          {
            when: "Month 2",
            what: "Relief from uncertainty",
            note: "The immediate discomfort fades quickly.",
          },
          {
            when: "Month 6",
            what: "Unresolved tension returns",
            note: "The same decision reappears with higher emotional cost.",
          },
          {
            when: "Year 1",
            what: "Opportunity window narrows",
            note: "Market and energy no longer match your original timing.",
          },
          {
            when: "Year 3",
            what: "Narrative hardens",
            note: "'I could have' becomes harder to ignore.",
          },
        ],
      },
    ],
  },
  money: {
    bias_note: "You optimized for certainty, but left return asymmetry underexplored.",
    pattern_sub: "These futures compare downside containment against upside capture.",
    fork_point: {
      body: "The fork point is whether liquidity needs in the next 9 months force early exits.",
      action: "Model monthly burn and minimum emergency reserve before choosing a portfolio path.",
    },
    futures: [
      {
        id: "f1",
        color: "#2DD68A",
        label: "If upside compounds",
        title: "You take the growth-biased option and returns outperform inflation strongly.",
        summary: "Volatile months are uncomfortable, but 3-year outcome is materially better.",
        confidence: 47,
        risk_score: 57,
        risk_level: "medium",
        upside_score: 88,
        regret_score: 31,
        volatility: "high",
        time_horizon: "24-48 months",
        path_type: "growth",
        key_assumption: "You can hold through drawdowns without panic selling.",
        events: [
          { when: "Quarter 1", what: "Sharp drawdown", note: "You test emotional tolerance early." },
          { when: "Year 1", what: "Recovery and alpha", note: "Risk assets begin outperforming baseline." },
          { when: "Year 2", what: "Compounding accelerates", note: "You benefit from staying systematic." },
          { when: "Year 4", what: "Financial flexibility", note: "You gain optionality for bigger bets." },
        ],
      },
      {
        id: "f2",
        color: "#E6A830",
        label: "If drawdown hits",
        title: "You take risk but timing is poor and short-term losses mount.",
        summary: "Without buffers, forced decisions reduce long-term expected return.",
        confidence: 63,
        risk_score: 76,
        risk_level: "high",
        upside_score: 49,
        regret_score: 68,
        volatility: "high",
        time_horizon: "6-24 months",
        path_type: "overexposed",
        key_assumption: "Cash reserves are enough to avoid liquidation.",
        events: [
          { when: "Month 2", what: "Loss threshold breached", note: "Risk feels personal, not abstract." },
          { when: "Month 5", what: "Liquidity stress", note: "You consider selling near lows." },
          { when: "Year 1", what: "Partial recovery", note: "Returns lag due to defensive moves." },
          { when: "Year 2", what: "Discipline reset", note: "You rebuild process with safeguards." },
        ],
      },
      {
        id: "f3",
        color: "#5A8DF0",
        label: "If balanced",
        title: "You choose a diversified middle path and preserve capital while growing steadily.",
        summary: "Lower stress and lower extremes produce consistent but moderate outcomes.",
        confidence: 66,
        risk_score: 42,
        risk_level: "low",
        upside_score: 61,
        regret_score: 37,
        volatility: "low",
        time_horizon: "12-36 months",
        path_type: "balanced",
        key_assumption: "You stick to allocations during noisy market cycles.",
        events: [
          { when: "Month 3", what: "Diversification cushions decline", note: "Losses stay within planned band." },
          { when: "Year 1", what: "Steady gains", note: "Compounding remains stable, if unspectacular." },
          { when: "Year 2", what: "Rebalancing gains", note: "Process beats prediction." },
          { when: "Year 3", what: "Goal milestone reached", note: "Capital plan remains on track." },
        ],
      },
      {
        id: "f4",
        color: "#9A9890",
        label: "If you freeze",
        title: "You postpone decisions and sit mostly in cash.",
        summary: "Drawdown risk stays low, but purchasing power and opportunity cost grow.",
        confidence: 71,
        risk_score: 58,
        risk_level: "medium",
        upside_score: 24,
        regret_score: 74,
        volatility: "very low",
        time_horizon: "18-36 months",
        path_type: "inactive",
        key_assumption: "Inflation impact will remain manageable.",
        events: [
          { when: "Month 1", what: "Short-term comfort", note: "No market anxiety from day-to-day moves." },
          { when: "Year 1", what: "Real return erosion", note: "Inflation quietly taxes idle capital." },
          { when: "Year 2", what: "Re-entry fear", note: "Higher prices make action harder." },
          { when: "Year 3", what: "Regret crystallizes", note: "You prioritize safety over goals for too long." },
        ],
      },
    ],
  },
  relationship: {
    bias_note: "You optimized for harmony now, but long-term emotional debt is rising.",
    pattern_sub: "These paths weigh honest friction against delayed conflict costs.",
    fork_point: {
      body: "The fork point is whether you make expectations explicit this month.",
      action: "Have one structured conversation: needs, boundaries, and timeline for re-evaluation.",
    },
    futures: [
      {
        id: "f1",
        color: "#2DD68A",
        label: "If you address it",
        title: "You start direct conversations early and co-design next steps.",
        summary: "Short-term discomfort creates long-term clarity and stronger trust.",
        confidence: 59,
        risk_score: 35,
        risk_level: "low",
        upside_score: 84,
        regret_score: 22,
        volatility: "medium",
        time_horizon: "3-12 months",
        path_type: "honest",
        key_assumption: "Both sides are willing to hear hard truths calmly.",
        events: [
          { when: "Week 1", what: "Hard conversation", note: "Tension spikes before understanding improves." },
          { when: "Month 1", what: "Boundaries clarified", note: "Ambiguity begins to reduce." },
          { when: "Month 3", what: "Pattern shift", note: "Arguments become more constructive." },
          { when: "Year 1", what: "Stronger alignment", note: "Trust grows from consistency." },
        ],
      },
      {
        id: "f2",
        color: "#E6A830",
        label: "If conflict escalates",
        title: "You try to address it, but execution is reactive and inconsistent.",
        summary: "Progress is uneven and resentment cycles remain.",
        confidence: 64,
        risk_score: 72,
        risk_level: "high",
        upside_score: 46,
        regret_score: 61,
        volatility: "high",
        time_horizon: "1-9 months",
        path_type: "volatile",
        key_assumption: "Emotional regulation improves fast enough to avoid spirals.",
        events: [
          { when: "Week 2", what: "Mixed signals", note: "Intentions are positive but not sustained." },
          { when: "Month 2", what: "Repeated trigger", note: "Old patterns resurface under stress." },
          { when: "Month 5", what: "External support sought", note: "Third-party perspective reduces noise." },
          { when: "Month 8", what: "Decision point", note: "Either recommit with structure or separate." },
        ],
      },
      {
        id: "f3",
        color: "#5A8DF0",
        label: "If you pace it",
        title: "You make gradual changes and review progress monthly.",
        summary: "Lower emotional whiplash, slower but steadier improvement.",
        confidence: 67,
        risk_score: 45,
        risk_level: "medium",
        upside_score: 63,
        regret_score: 39,
        volatility: "low",
        time_horizon: "6-18 months",
        path_type: "incremental",
        key_assumption: "Both sides stay patient enough for slow gains.",
        events: [
          { when: "Month 1", what: "Shared check-in cadence", note: "Small rituals reduce escalation." },
          { when: "Month 4", what: "Early wins", note: "Trust grows through reliability." },
          { when: "Month 9", what: "Deeper issues surfaced", note: "Now solvable with better context." },
          { when: "Year 1", what: "Stability improves", note: "Less drama, more predictability." },
        ],
      },
      {
        id: "f4",
        color: "#9A9890",
        label: "If you avoid it",
        title: "You postpone meaningful conversations to keep peace now.",
        summary: "Immediate calm improves, but unresolved tension compounds.",
        confidence: 74,
        risk_score: 69,
        risk_level: "high",
        upside_score: 26,
        regret_score: 83,
        volatility: "low",
        time_horizon: "12-24 months",
        path_type: "avoidant",
        key_assumption: "Silence will not eventually become resentment.",
        events: [
          { when: "Week 1", what: "Surface calm", note: "No immediate friction." },
          { when: "Month 4", what: "Distance grows", note: "Unsaid expectations widen the gap." },
          { when: "Month 9", what: "Trust fatigue", note: "Both parties feel unseen." },
          { when: "Year 2", what: "Hard reset forced", note: "Delayed decisions become binary." },
        ],
      },
    ],
  },
  life: {
    bias_note: "You are solving for certainty, but identity growth needs controlled uncertainty.",
    pattern_sub: "These futures contrast comfort optimization versus meaningful challenge.",
    fork_point: {
      body: "The fork point is whether you commit to one concrete experiment in the next 14 days.",
      action: "Define a 30-day test with a measurable outcome and a clear stop/continue rule.",
    },
    futures: [
      {
        id: "f1",
        color: "#2DD68A",
        label: "If you commit",
        title: "You take the challenge path and build momentum through action.",
        summary: "Early friction gives way to confidence and clearer identity.",
        confidence: 54,
        risk_score: 44,
        risk_level: "medium",
        upside_score: 79,
        regret_score: 27,
        volatility: "medium",
        time_horizon: "3-12 months",
        path_type: "commitment",
        key_assumption: "You maintain cadence when motivation dips.",
        events: [
          { when: "Week 2", what: "Discomfort spike", note: "New routine feels costly initially." },
          { when: "Month 2", what: "Competence gains", note: "Progress becomes visible and motivating." },
          { when: "Month 6", what: "Identity shift", note: "You trust yourself more under uncertainty." },
          { when: "Year 1", what: "Expanded options", note: "You can choose from stronger positions." },
        ],
      },
      {
        id: "f2",
        color: "#E6A830",
        label: "If energy dips",
        title: "You start strong but overcommit and burn out.",
        summary: "Ambition is high, but pacing and recovery are inadequate.",
        confidence: 62,
        risk_score: 74,
        risk_level: "high",
        upside_score: 48,
        regret_score: 58,
        volatility: "high",
        time_horizon: "1-8 months",
        path_type: "unsustainable",
        key_assumption: "Current schedule can absorb added load.",
        events: [
          { when: "Week 1", what: "High intensity launch", note: "Output rises quickly." },
          { when: "Month 2", what: "Recovery debt", note: "Fatigue affects consistency." },
          { when: "Month 4", what: "Motivation drop", note: "Goals feel heavier than expected." },
          { when: "Month 6", what: "Recalibration", note: "You redesign around sustainability." },
        ],
      },
      {
        id: "f3",
        color: "#5A8DF0",
        label: "If you pilot",
        title: "You test a smaller version before full commitment.",
        summary: "Risk remains moderate while evidence quality improves.",
        confidence: 69,
        risk_score: 41,
        risk_level: "low",
        upside_score: 67,
        regret_score: 34,
        volatility: "low",
        time_horizon: "6-15 months",
        path_type: "experimental",
        key_assumption: "Pilot metrics reflect the full journey accurately enough.",
        events: [
          { when: "Month 1", what: "Scope constrained", note: "Complexity stays manageable." },
          { when: "Month 3", what: "Signal quality improves", note: "Evidence replaces guesswork." },
          { when: "Month 7", what: "Confident scale decision", note: "You know what is worth doubling down on." },
          { when: "Year 1", what: "Sustainable growth", note: "Progress compounds without major shocks." },
        ],
      },
      {
        id: "f4",
        color: "#9A9890",
        label: "If you defer",
        title: "You wait for perfect certainty before acting.",
        summary: "Stress is lower now, but opportunity costs become visible later.",
        confidence: 72,
        risk_score: 64,
        risk_level: "medium",
        upside_score: 29,
        regret_score: 78,
        volatility: "very low",
        time_horizon: "12-36 months",
        path_type: "deferred",
        key_assumption: "Future circumstances will make action easier.",
        events: [
          { when: "Month 1", what: "Temporary relief", note: "No immediate disruption required." },
          { when: "Month 6", what: "Energy plateaus", note: "Enthusiasm fades without action." },
          { when: "Year 1", what: "Window narrows", note: "Life complexity increases switching costs." },
          { when: "Year 2", what: "Regret pattern", note: "The same choice feels heavier than before." },
        ],
      },
    ],
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function inferDomain(decision) {
  const text = (decision || "").toLowerCase();

  if (/salary|invest|money|loan|debt|finance|stocks|fund/.test(text)) return "money";
  if (/relationship|marry|partner|dating|breakup|family/.test(text)) return "relationship";
  if (/career|job|startup|quit|promotion|founder|work/.test(text)) return "career";
  return "life";
}

function riskLevelFromScore(score) {
  if (score >= 67) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function buildScenarioPayload(inputCtx = {}) {
  const domain = inputCtx.domain || inferDomain(inputCtx.decision || "");
  const libraryEntry = SCENARIO_LIBRARY[domain] || SCENARIO_LIBRARY.life;
  const scenario = clone(libraryEntry);
  const seed = hashString(`${inputCtx.decision || "decision"}-${JSON.stringify(inputCtx.answers || {})}`);
  const shift = seed % 7;

  const futures = scenario.futures.map((future, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const riskDelta = direction * (shift % 5);
    const riskScore = Math.max(12, Math.min(92, future.risk_score + riskDelta));
    const upsideDelta = (shift + index) % 4;
    const upsideScore = Math.max(10, Math.min(95, future.upside_score - direction * upsideDelta));

    return {
      ...future,
      confidence: Math.max(20, Math.min(90, future.confidence + (shift % 3) - 1)),
      risk_score: riskScore,
      risk_level: riskLevelFromScore(riskScore),
      upside_score: upsideScore,
      regret_score: Math.max(10, Math.min(95, future.regret_score + direction * ((shift + 2) % 4))),
      score_breakdown: {
        uncertainty: Math.max(10, Math.min(95, riskScore + 8)),
        reversibility: Math.max(10, Math.min(95, 100 - riskScore + 10)),
        downside_impact: Math.max(10, Math.min(95, riskScore + 5)),
        learning_velocity: Math.max(10, Math.min(95, upsideScore - 4)),
      },
    };
  });

  return {
    domain,
    bias_note: scenario.bias_note,
    pattern_sub: scenario.pattern_sub,
    futures,
    fork_point: scenario.fork_point,
    meta: {
      scenario_id: `${domain}-scenario-${(seed % 4) + 1}`,
      generated_at: new Date().toISOString(),
      generated_by: "demo-mock-engine-v2",
      synthetic: true,
      cards_count: futures.length,
      decision_excerpt: (inputCtx.decision || "").slice(0, 80),
      scoring_model: {
        risk_score_scale: "0-100 (higher = riskier)",
        upside_score_scale: "0-100 (higher = more upside)",
        regret_score_scale: "0-100 (higher = more future regret)",
        confidence_scale: "0-100 (higher = stronger model belief)",
      },
      scoring_weights: {
        uncertainty: 0.32,
        downside_impact: 0.28,
        reversibility: 0.2,
        learning_velocity: 0.2,
      },
      test_vectors: {
        domain_detected: domain,
        answers_used: Object.keys(inputCtx.answers || {}).length,
        skipped_questions: (inputCtx.skipped || []).length,
      },
    },
  };
}

export function parseMock(decision) {
  const domain = inferDomain(decision);

  return {
    summary: `You are deciding what to do about: ${decision}`,
    domain,
    options: ["quit now", "stay one year"],
    variables: ["runway", "problem clarity", "energy sustainability"],
    confidence: 24,
    ask_questions: true,
  };
}

export function questionMock(questionNumber) {
  const idx = questionNumber - 1;
  const question = QUESTION_BANK[idx];

  if (!question) {
    return {
      done: true,
      confidence: 92,
    };
  }

  return {
    done: false,
    confidence: question.confidence,
    question: clone(question),
  };
}

export function futuresMock(inputCtx) {
  return buildScenarioPayload(inputCtx);
}

export function chatMock(message) {
  const normalized = message.toLowerCase();
  const rerun =
    normalized.includes("pivot") ||
    normalized.includes("different") ||
    normalized.includes("change") ||
    normalized.includes("new info");

  return {
    reply: rerun
      ? "If the context changed materially, your previous futures are now stale. You should rerun so the model recalibrates trade-offs."
      : "Least-regret paths usually combine bounded downside with fast learning loops. In your case, pick the move that increases real market feedback in the next 30 days.",
    rerun,
  };
}
