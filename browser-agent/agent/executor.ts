import { click, goBack, navigateTab, scroll, wait } from "./actions.js";
import { AgentDecision, JobCard, PageSnapshot } from "./state.js";

export async function openJob(tabId: number, job: JobCard): Promise<void> {
  if (job.href) {
    await navigateTab(tabId, job.href);
    return;
  }

  if (job.titleSelector) {
    await click(tabId, job.titleSelector);
    await wait(1500);
    return;
  }

  if (job.cardSelector) {
    await click(tabId, job.cardSelector);
    await wait(1500);
    return;
  }

  throw new Error(`No navigation target found for ${job.title}`);
}

export async function executeDecision(
  tabId: number,
  decision: AgentDecision,
  job: JobCard,
  snapshot: PageSnapshot
): Promise<boolean> {
  if (decision.decision !== "APPLY") {
    await scroll(tabId, 420);
    return false;
  }

  const selectors = [job.applySelector, ...snapshot.applySelectors].filter(
    (selector): selector is string => Boolean(selector)
  );

  for (const selector of selectors) {
    try {
      await click(tabId, selector);
      await wait(1800);
      return true;
    } catch {
      // Try the next candidate.
    }
  }

  return false;
}

export async function closeOverlays(tabId: number, snapshot: PageSnapshot): Promise<void> {
  for (const selector of snapshot.closeSelectors) {
    try {
      await click(tabId, selector);
      await wait(600);
    } catch {
      // ignore non-clickable close control
    }
  }
}

export async function returnToListings(tabId: number, previousUrl: string): Promise<void> {
  try {
    await goBack(tabId);
  } catch {
    await navigateTab(tabId, previousUrl);
  }
}
