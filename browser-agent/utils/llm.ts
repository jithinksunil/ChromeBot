import { OPENAI_MODEL } from "../config/constants.js";
import { AgentDecision, AgentInstruction, JobCard } from "../agent/state.js";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function decideWithLLM(
  instruction: AgentInstruction,
  job: JobCard
): Promise<AgentDecision> {
  const apiKey = instruction.openaiApiKey ?? readEnvApiKey();

  if (!apiKey) {
    return mockDecision(instruction, job, "OPENAI_API_KEY missing, using mock decision");
  }

  try {
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a strict job-application decision engine. Return only compact JSON with decision (APPLY/SKIP) and reason."
        },
        {
          role: "user",
          content: JSON.stringify({ instruction, job })
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_decision",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["decision", "reason"],
            properties: {
              decision: { type: "string", enum: ["APPLY", "SKIP"] },
              reason: { type: "string" }
            }
          }
        }
      }
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return mockDecision(instruction, job, `OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as ChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return mockDecision(instruction, job, "Empty OpenAI response; fallback mock");
    }

    const parsed = JSON.parse(content) as AgentDecision;
    if (parsed.decision !== "APPLY" && parsed.decision !== "SKIP") {
      return mockDecision(instruction, job, "Malformed decision format; fallback mock");
    }
    return parsed;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown LLM error";
    return mockDecision(instruction, job, reason);
  }
}

export function mockDecision(
  instruction: AgentInstruction,
  job: JobCard,
  suffix = "keyword match"
): AgentDecision {
  const text = `${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase();
  const matches = instruction.skills.some((skill) => text.includes(skill.toLowerCase()));
  return {
    decision: matches ? "APPLY" : "SKIP",
    reason: matches ? `Mock APPLY (${suffix})` : `Mock SKIP (${suffix})`
  };
}

function readEnvApiKey(): string | undefined {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return maybeProcess?.env?.OPENAI_API_KEY;
}
