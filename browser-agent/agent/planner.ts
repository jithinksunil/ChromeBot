import { decideWithLLM } from "../utils/llm.js";
import { AgentDecision, AgentInstruction, JobCard } from "./state.js";

export async function planDecision(
  instruction: AgentInstruction,
  job: JobCard
): Promise<AgentDecision> {
  return decideWithLLM(instruction, job);
}
