import { config } from "../config.js";

const apiDebugStore = {
  entries: [],
  listeners: new Set(),
};

function emitDebugUpdate() {
  for (const listener of apiDebugStore.listeners) {
    listener(apiDebugStore.entries);
  }
}

function recordExchange(entry) {
  apiDebugStore.entries = [entry, ...apiDebugStore.entries].slice(0, 8);
  emitDebugUpdate();
}

async function postApi(endpoint, body) {
  const startedAt = new Date().toISOString();

  try {
    const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    let parsed = null;

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = rawText;
    }

    recordExchange({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      endpoint,
      startedAt,
      ok: response.ok,
      status: response.status,
      request: body,
      response: parsed,
    });

    if (!response.ok) {
      throw new Error(`${endpoint} failed: ${response.status} ${rawText}`);
    }

    return parsed;
  } catch (error) {
    recordExchange({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      endpoint,
      startedAt,
      ok: false,
      status: "network_error",
      request: body,
      response: { message: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}

function buildMetadata(requestId) {
  return {
    request_id: requestId,
    debug: false,
  };
}

export async function runListener(context, userMessage) {
  return postApi("/api/v1/listener", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`listener-${Date.now()}`),
  });
}

export async function runQuestioner(context, userMessage = "Ask the next best questions.") {
  return postApi("/api/v1/questioner", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`questioner-${Date.now()}`),
  });
}

export async function runPatternReader(context, userMessage = "Identify the strongest pattern in how this decision is being framed.") {
  return postApi("/api/v1/pattern-reader", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`pattern-reader-${Date.now()}`),
  });
}

export async function runSurgeon(context, userMessage = "Generate the four futures, fork point, and one concrete action.") {
  return postApi("/api/v1/surgeon", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`surgeon-${Date.now()}`),
  });
}

export async function runCompanion(context, userMessage) {
  return postApi("/api/v1/companion", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`companion-${Date.now()}`),
  });
}

export async function getBackendHealth() {
  const response = await fetch(`${config.apiBaseUrl}/health`);
  if (!response.ok) {
    throw new Error(`health failed: ${response.status}`);
  }
  return response.json();
}

export async function getApiUsage() {
  const response = await fetch(`${config.apiBaseUrl}/api/v1/usage`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`/api/v1/usage failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

export function subscribeToApiDebug(listener) {
  apiDebugStore.listeners.add(listener);
  listener(apiDebugStore.entries);

  return () => {
    apiDebugStore.listeners.delete(listener);
  };
}
