import { MAX_DELAY_MS, MAX_FAILURES, MIN_DELAY_MS } from "../config/constants.js";
import { click, navigateTab, typeText, wait } from "./actions.js";
import { readPageSnapshot } from "./domReader.js";
import { closeOverlays, executeDecision, openJob, returnToListings } from "./executor.js";
import { logDecision } from "./logger.js";
import { planDecision, planNavigation } from "./planner.js";
import { AgentInstruction, AgentRuntimeState } from "./state.js";

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
  const visitedJobs = new Set<string>();
  let stagnantCycles = 0;

  while (getRunning()) {
    if (state.appliedCount >= instruction.maxApplications) break;
    if (state.failures >= MAX_FAILURES) break;
    if (stagnantCycles >= 4) {
      state.lastReason =
        "Agent stopped after multiple cycles with no new jobs or navigation options";
      break;
    }

    try {
      const snapshot = await readPageSnapshot(tabId);

      if (snapshot.pageType !== "listing") {
        const moved = await navigateTowardsJobs(tabId, instruction, snapshot);
        if (!moved) {
          stagnantCycles += 1;
          state.lastReason = `No actionable job navigation found on ${snapshot.title}`;
          await wait(randomDelay());
        } else {
          stagnantCycles = 0;
        }
        continue;
      }

      const candidates = snapshot.jobs.filter((job) => !visitedJobs.has(job.id));
      if (candidates.length === 0) {
        if (snapshot.nextPageSelector) {
          await click(tabId, snapshot.nextPageSelector);
          stagnantCycles = 0;
          await wait(randomDelay());
          continue;
        }

        const navigation = await planNavigation(instruction, snapshot);
        state.lastReason = navigation.reason;
        stagnantCycles += 1;
        await wait(randomDelay());
        continue;
      }

      let madeProgress = false;
      for (const job of candidates) {
        if (!getRunning() || state.appliedCount >= instruction.maxApplications) {
          break;
        }

        visitedJobs.add(job.id);
        madeProgress = true;
        const decision = await planDecision(instruction, job, snapshot);

        await logDecision({
          timestamp: new Date().toISOString(),
          title: job.title,
          company: job.company,
          decision: decision.decision,
          reason: decision.reason
        });

        if (decision.decision !== "APPLY") {
          await wait(randomDelay());
          continue;
        }

        const listingUrl = snapshot.url;
        await openJob(tabId, job);
        await wait(randomDelay());
        const detailSnapshot = await readPageSnapshot(tabId);
        const applied = await executeDecision(tabId, decision, job, detailSnapshot);

        if (applied) {
          state.appliedCount += 1;
        } else {
          state.lastReason = `No apply control found for ${job.title}`;
        }

        await closeOverlays(tabId, detailSnapshot);
        await wait(1200);
        await returnToListings(tabId, listingUrl);
        await wait(randomDelay());
      }

      stagnantCycles = madeProgress ? 0 : stagnantCycles + 1;
    } catch (error) {
      state.failures += 1;
      state.lastReason = error instanceof Error ? error.message : "Unknown runtime error";
      await logDecision({
        timestamp: new Date().toISOString(),
        title: "N/A",
        company: "N/A",
        decision: "ERROR",
        reason: state.lastReason
      });
      await wait(randomDelay());
    }
  }

  state.isRunning = false;
  return state;
}

async function navigateTowardsJobs(
  tabId: number,
  instruction: AgentInstruction,
  snapshot: Awaited<ReturnType<typeof readPageSnapshot>>
): Promise<boolean> {
  const navigation = await planNavigation(instruction, snapshot);

  if (navigation.action === "RUN_SEARCH" && snapshot.searchForm) {
    if (snapshot.searchForm.keywordSelector) {
      await typeText(tabId, snapshot.searchForm.keywordSelector, instruction.role);
    }
    if (snapshot.searchForm.locationSelector && instruction.locations[0]) {
      await typeText(tabId, snapshot.searchForm.locationSelector, instruction.locations[0]);
    }
    if (snapshot.searchForm.submitSelector) {
      await click(tabId, snapshot.searchForm.submitSelector);
      await wait(1800);
      return true;
    }
  }

  if (navigation.action === "OPEN_JOBS") {
    const jobsTarget = snapshot.navigationTargets.find((target) =>
      /jobs|search/i.test(target.label)
    );
    if (jobsTarget?.href) {
      await navigateTab(tabId, jobsTarget.href);
      return true;
    }
    if (jobsTarget?.selector) {
      await click(tabId, jobsTarget.selector);
      await wait(1800);
      return true;
    }
  }

  return false;
}

function randomDelay(): number {
  return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
}
