import { decideNavigation, decideWithLLM } from "../utils/llm.js";
import {
  AgentDecision,
  AgentInstruction,
  JobCard,
  NavigationDecision,
  PageSnapshot
} from "./state.js";

export async function planDecision(
  instruction: AgentInstruction,
  job: JobCard,
  snapshot: PageSnapshot
): Promise<AgentDecision> {
  return decideWithLLM(instruction, job, snapshot);
}

export async function planNavigation(
  instruction: AgentInstruction,
  snapshot: PageSnapshot
): Promise<NavigationDecision> {
  return decideNavigation(instruction, snapshot);
}
