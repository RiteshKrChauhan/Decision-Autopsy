import { config } from "../config.js";
import { chatMock, futuresMock, parseMock, questionMock } from "./mockData.js";

function randomDelay() {
  const { min, max } = config.mockDelayMs;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function postMock(endpoint, body) {
  await wait(randomDelay());

  if (endpoint === "/parse") {
    return parseMock(body.decision);
  }

  if (endpoint === "/question") {
    return questionMock(body.question_number);
  }

  if (endpoint === "/futures") {
    return futuresMock(body);
  }

  if (endpoint === "/chat") {
    return chatMock(body.message);
  }

  throw new Error(`Unknown mock endpoint: ${endpoint}`);
}

async function postApi(endpoint, body) {
  const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${endpoint} failed: ${response.status}`);
  }

  return response.json();
}

export async function post(endpoint, body) {
  if (config.useMockApi) {
    return postMock(endpoint, body);
  }

  return postApi(endpoint, body);
}
