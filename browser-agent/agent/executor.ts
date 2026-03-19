import { click, scroll } from "./actions.js";
import { AgentDecision, JobCard } from "./state.js";

export async function executeDecision(
  tabId: number,
  decision: AgentDecision,
  job: JobCard
): Promise<boolean> {
  if (decision.decision !== "APPLY") {
    await scroll(tabId, 360);
    return false;
  }

  if (!job.applySelector) return false;

  await click(tabId, job.applySelector);
  await scroll(tabId, 220);
  return true;
}
