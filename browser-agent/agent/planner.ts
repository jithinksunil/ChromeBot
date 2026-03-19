import { AgentDecision, AgentInstruction, JobCard } from "./state";
import { decideWithLLM } from "../utils/llm";

export async function planDecision(instruction: AgentInstruction, job: JobCard): Promise<AgentDecision> {
  return decideWithLLM(instruction, job);
}
