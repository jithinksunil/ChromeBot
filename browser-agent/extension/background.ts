import { runAgentLoop } from "../agent/agent.js";
import { RUNTIME_STORAGE_KEY } from "../config/constants.js";
import { AgentInstruction } from "../agent/state.js";

let running = false;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AGENT_START") {
    void startAgent(message.payload as AgentInstruction)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : "Unknown error";
        sendResponse({ ok: false, error: reason });
      });
    return true;
  }

  if (message?.type === "AGENT_STOP") {
    running = false;
    void chrome.storage.local.set({ [RUNTIME_STORAGE_KEY]: { isRunning: false } });
    sendResponse({ ok: true });
  }

  return false;
});

async function startAgent(instruction: AgentInstruction) {
  running = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found");

  const result = await runAgentLoop(tab.id, instruction, () => running);
  await chrome.storage.local.set({ [RUNTIME_STORAGE_KEY]: result });
  running = false;
  return result;
}
