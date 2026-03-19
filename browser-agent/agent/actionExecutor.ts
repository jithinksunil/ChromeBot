import { MAX_DELAY_MS, MIN_DELAY_MS } from "../config/constants.js";
import { AgentAction, ExecutionResult } from "./state.js";

export async function executeAgentAction(
  tabId: number,
  action: AgentAction
): Promise<ExecutionResult> {
  if (action.action === "WAIT") {
    await wait(randomDelay());
    return { ok: true, detail: action.reason };
  }

  if (action.action === "NAVIGATE") {
    const url = action.url ?? action.target;
    if (!url) {
      return { ok: false, detail: "Missing navigate target" };
    }

    await chrome.tabs.update(tabId, { url });
    await waitForTabComplete(tabId);
    return { ok: true, detail: `navigated to ${url}` };
  }

  const response = (await chrome.tabs.sendMessage(tabId, {
    type: "EXECUTE_ACTION",
    payload: action
  })) as ExecutionResult;

  if (action.action === "CLICK") {
    await wait(1600);
  }

  return response;
}

export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(): number {
  return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
}

async function waitForTabComplete(tabId: number, settleMs = 1200): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(done, 15000);

    function done() {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(resolve, settleMs);
    }

    function listener(updatedTabId: number, changeInfo: { status?: string }) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        done();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}
