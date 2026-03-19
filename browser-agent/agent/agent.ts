import { MAX_DELAY_MS, MAX_FAILURES, MIN_DELAY_MS } from "../config/constants";
import { executeDecision } from "./executor";
import { logDecision } from "./logger";
import { planDecision } from "./planner";
import { AgentInstruction, AgentRuntimeState } from "./state";
import { readJobCards } from "./domReader";

export async function runAgentLoop(
  tabId: number,
  instruction: AgentInstruction,
  getRunning: () => boolean
): Promise<AgentRuntimeState> {
  const state: AgentRuntimeState = {
    isRunning: true,
    appliedCount: 0,
    failures: 0
  };

  while (getRunning()) {
    if (state.appliedCount >= instruction.maxApplications) break;
    if (state.failures >= MAX_FAILURES) break;

    try {
      const jobs = await readJobCards(tabId);
      if (jobs.length === 0) {
        state.lastReason = "No job cards found";
        break;
      }

      for (const job of jobs) {
        if (!getRunning() || state.appliedCount >= instruction.maxApplications) {
          break;
        }

        const decision = await planDecision(instruction, job);
        const applied = await executeDecision(tabId, decision, job);

        if (applied) state.appliedCount += 1;

        await logDecision({
          timestamp: new Date().toISOString(),
          title: job.title,
          company: job.company,
          decision: decision.decision,
          reason: decision.reason
        });

        await delay(randomDelay());
      }

      await delay(randomDelay());
    } catch (error) {
      state.failures += 1;
      state.lastReason =
        error instanceof Error ? error.message : "Unknown runtime error";
      await logDecision({
        timestamp: new Date().toISOString(),
        title: "N/A",
        company: "N/A",
        decision: "ERROR",
        reason: state.lastReason
      });
      await delay(randomDelay());
    }
  }

  state.isRunning = false;
  return state;
}

function randomDelay(): number {
  return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
