import { click, scroll } from "./actions";
import { AgentDecision, JobCard } from "./state";

export async function executeDecision(tabId: number, decision: AgentDecision, job: JobCard): Promise<boolean> {
  if (decision.decision !== "APPLY") {
    await scroll(tabId, 360);
    return false;
  }

  if (!job.applySelector) return false;

  await click(tabId, job.applySelector);
  await scroll(tabId, 220);
  return true;
}
