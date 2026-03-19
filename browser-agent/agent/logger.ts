import { LOG_STORAGE_KEY } from "../config/constants";
import { AgentLogEntry } from "./state";

export async function logDecision(entry: AgentLogEntry): Promise<void> {
  const current = await chrome.storage.local.get(LOG_STORAGE_KEY);
  const logs = (current[LOG_STORAGE_KEY] as AgentLogEntry[] | undefined) ?? [];
  logs.push(entry);
  await chrome.storage.local.set({ [LOG_STORAGE_KEY]: logs.slice(-300) });
}
