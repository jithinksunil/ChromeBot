import { MAX_FAILURES } from "../config/constants.js";
import { executeAgentAction, randomDelay, wait } from "./actionExecutor.js";
import { decideNextAction } from "./decisionEngine.js";
import { logPipelineStep } from "./logger.js";
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
      await logSystemStep(runtime, "Reached the configured max applications limit");
      break;
    }
    if (runtime.failures >= MAX_FAILURES) {
      runtime.lastReason = "Failure threshold reached";
      await logSystemStep(runtime, "Stopped after hitting the failure threshold");
      break;
    }
    if (runtime.iterations >= MAX_ITERATIONS) {
      runtime.lastReason = "Iteration limit reached";
      await logSystemStep(runtime, "Stopped after hitting the iteration limit");
      break;
    }

    try {
      const observation = await observePage(tabId);
      runtime.iterations += 1;
      runtime.lastPageType = observation.pageType;

      await logPipelineStep({
        timestamp: new Date().toISOString(),
        iteration: runtime.iterations,
        stage: "OBSERVE",
        pageType: observation.pageType,
        pageTitle: observation.title,
        reason: `Observed ${observation.pageType} page`,
        success: true,
        detail: summarizeObservation(observation)
      });

      const pageFingerprint = `${observation.pageType}|${observation.title}|${observation.jobs[0]?.id ?? "none"}`;
      const pageVisits = (seenPages.get(pageFingerprint) ?? 0) + 1;
      seenPages.set(pageFingerprint, pageVisits);
      if (pageVisits > MAX_STUCK_LOOPS) {
        runtime.lastReason = `Detected stuck loop on ${observation.title}`;
        await logPipelineStep({
          timestamp: new Date().toISOString(),
          iteration: runtime.iterations,
          stage: "SYSTEM",
          pageType: observation.pageType,
          pageTitle: observation.title,
          reason: runtime.lastReason,
          success: false,
          detail: `pageFingerprint=${pageFingerprint}; visits=${pageVisits}`
        });
        break;
      }

      const action = await decideNextAction(instruction, observation, runtime);
      runtime.lastAction = action;

      await logPipelineStep({
        timestamp: new Date().toISOString(),
        iteration: runtime.iterations,
        stage: "DECIDE",
        pageType: observation.pageType,
        pageTitle: observation.title,
        action: action.action,
        target: action.target,
        reason: action.reason,
        success: true,
        detail: `target=${action.target ?? "n/a"}; url=${action.url ?? "n/a"}; value=${maskValue(action.value)}`
      });

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

      await logPipelineStep({
        timestamp: new Date().toISOString(),
        iteration: runtime.iterations,
        stage: "ACT",
        pageType: observation.pageType,
        pageTitle: observation.title,
        action: action.action,
        target: action.target,
        reason: action.reason,
        success,
        detail: `execution=${execution.detail ?? "n/a"}; matched=${execution.matchedText ?? "n/a"}; selector=${execution.selector ?? "n/a"}; appliedCount=${runtime.appliedCount}; failures=${runtime.failures}`
      });

      if (action.action === "STOP") {
        await logSystemStep(
          runtime,
          "Received STOP decision from the decision engine",
          observation
        );
        break;
      }

      await wait(randomDelay());
    } catch (error) {
      runtime.failures += 1;
      runtime.lastReason = error instanceof Error ? error.message : "Unknown runtime error";
      await logPipelineStep({
        timestamp: new Date().toISOString(),
        iteration: runtime.iterations,
        stage: "ERROR",
        pageType: runtime.lastPageType ?? "unknown",
        pageTitle: "Unknown page",
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

function summarizeObservation(observation: PageObservation): string {
  const elementSummary = observation.elements
    .slice(0, 8)
    .map((element) => `${element.type}:${element.text}`)
    .join(" | ");
  return `url=${observation.url}; pageType=${observation.pageType}; jobs=${observation.jobs.length}; noResults=${observation.noResults}; elements=${elementSummary}`;
}

function maskValue(value?: string): string {
  if (!value) return "n/a";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

async function logSystemStep(
  runtime: AgentRuntimeState,
  reason: string,
  observation?: PageObservation
): Promise<void> {
  await logPipelineStep({
    timestamp: new Date().toISOString(),
    iteration: runtime.iterations,
    stage: "SYSTEM",
    pageType: observation?.pageType ?? runtime.lastPageType ?? "unknown",
    pageTitle: observation?.title ?? "Runtime",
    reason,
    success: true,
    detail: `appliedCount=${runtime.appliedCount}; failures=${runtime.failures}; iterations=${runtime.iterations}`
  });
}
