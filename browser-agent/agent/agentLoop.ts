import { MAX_FAILURES } from "../config/constants.js";
import { executeAgentAction, randomDelay, wait } from "./actionExecutor.js";
import { decideNextAction } from "./decisionEngine.js";
import { logDecision } from "./logger.js";
import { AgentInstruction, AgentRuntimeState, PageObservation } from "./state.js";

const MAX_ITERATIONS = 20;
const MAX_STUCK_LOOPS = 4;

export async function runAgentLoop(
  tabId: number,
  instruction: AgentInstruction,
  getRunning: () => boolean
): Promise<AgentRuntimeState> {
  const runtime: AgentRuntimeState = {
    isRunning: true,
    appliedCount: 0,
    failures: 0,
    iterations: 0
  };
  const seenPages = new Map<string, number>();

  while (getRunning()) {
    if (runtime.appliedCount >= instruction.maxApplications) {
      runtime.lastReason = "Max applications reached";
      break;
    }
    if (runtime.failures >= MAX_FAILURES) {
      runtime.lastReason = "Failure threshold reached";
      break;
    }
    if (runtime.iterations >= MAX_ITERATIONS) {
      runtime.lastReason = "Iteration limit reached";
      break;
    }

    try {
      const observation = await observePage(tabId);
      runtime.iterations += 1;
      runtime.lastPageType = observation.pageType;

      const pageFingerprint = `${observation.pageType}|${observation.title}|${observation.jobs[0]?.id ?? "none"}`;
      const pageVisits = (seenPages.get(pageFingerprint) ?? 0) + 1;
      seenPages.set(pageFingerprint, pageVisits);
      if (pageVisits > MAX_STUCK_LOOPS) {
        runtime.lastReason = `Detected stuck loop on ${observation.title}`;
        break;
      }

      const action = await decideNextAction(instruction, observation, runtime);
      runtime.lastAction = action;

      const execution = await executeAgentAction(tabId, action);
      const success = execution.ok;
      if (!success) {
        runtime.failures += 1;
        runtime.lastReason = execution.detail ?? action.reason;
      } else {
        runtime.lastReason = action.reason;
      }

      if (success && didLikelyApply(action, observation)) {
        runtime.appliedCount += 1;
      }

      await logDecision({
        timestamp: new Date().toISOString(),
        pageType: observation.pageType,
        pageTitle: observation.title,
        action: action.action,
        target: action.target,
        reason: action.reason,
        success,
        detail: summarizeObservation(observation, execution.detail)
      });

      if (action.action === "STOP") {
        break;
      }

      await wait(randomDelay());
    } catch (error) {
      runtime.failures += 1;
      runtime.lastReason = error instanceof Error ? error.message : "Unknown runtime error";
      await logDecision({
        timestamp: new Date().toISOString(),
        pageType: runtime.lastPageType ?? "unknown",
        pageTitle: "Unknown page",
        action: "ERROR",
        reason: runtime.lastReason,
        success: false,
        detail: "observe/decide/act loop error"
      });
      await wait(randomDelay());
    }
  }

  runtime.isRunning = false;
  return runtime;
}

async function observePage(tabId: number): Promise<PageObservation> {
  const response = (await chrome.tabs.sendMessage(tabId, { type: "OBSERVE_PAGE" })) as {
    ok: boolean;
    observation: PageObservation;
  };
  return response.observation;
}

function didLikelyApply(
  action: AgentRuntimeState["lastAction"],
  observation: PageObservation
): boolean {
  return Boolean(
    action &&
    action.action === "CLICK" &&
    /apply|submit/i.test(action.target ?? "") &&
    ["job_detail", "application_form"].includes(observation.pageType)
  );
}

function summarizeObservation(observation: PageObservation, detail?: string): string {
  const elementSummary = observation.elements
    .slice(0, 8)
    .map((element) => `${element.type}:${element.text}`)
    .join(" | ");
  return `pageType=${observation.pageType}; jobs=${observation.jobs.length}; elements=${elementSummary}; detail=${detail ?? "n/a"}`;
}
