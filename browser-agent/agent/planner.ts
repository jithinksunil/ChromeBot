import { decideWithLLM } from "../utils/llm";
import { AgentDecision, AgentInstruction, JobCard } from "./state";

export async function planDecision(
  instruction: AgentInstruction,
  job: JobCard
): Promise<AgentDecision> {
  return decideWithLLM(instruction, job);
}
