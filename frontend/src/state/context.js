export function createInitialContext() {
  return {
    decision: "",
    domain: "",
    options: [],
    variables: [],
    confidence: 0,
    ask_questions: true,
    answers: {},
    skipped: [],
    bias_note: "",
    futures: [],
    fork_point: null,
    chat_history: [],
  };
}
