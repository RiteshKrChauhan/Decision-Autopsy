export function createInitialContext() {
  return {
    decision: "",
    confidence: 0,
    clarity: 0,
    situation_summary: "",
    answers: {},
    skipped: [],
    listener_result: null,
    question_history: [],
    active_questions: [],
    pattern_analysis: {
      observation: "",
      sub: "",
      detected_patterns: [],
      confidence_notes: [],
    },
    autopsy: {
      timeline_ready: false,
      summary: "",
      futures: [],
      fork_point: {
        body: "",
        action: "",
      },
    },
  };
}
