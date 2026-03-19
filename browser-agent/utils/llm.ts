import { OPENAI_MODEL } from "../config/constants.js";
import {
  AgentDecision,
  AgentInstruction,
  JobCard,
  NavigationDecision,
  PageSnapshot
} from "../agent/state.js";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function decideWithLLM(
  instruction: AgentInstruction,
  job: JobCard,
  snapshot: PageSnapshot
): Promise<AgentDecision> {
  const apiKey = instruction.openaiApiKey ?? readEnvApiKey();

  if (!apiKey) {
    return mockDecision(instruction, job, snapshot, "OPENAI_API_KEY missing, using mock decision");
  }

  try {
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a strict job-application decision engine. Prefer quick/easy apply flows, reject unrelated roles, and return only compact JSON with decision (APPLY/SKIP) and reason."
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction,
            job,
            pageType: snapshot.pageType,
            pageTitle: snapshot.title,
            pageText: snapshot.pageText.slice(0, 1500)
          })
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
      return mockDecision(instruction, job, snapshot, `OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as ChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return mockDecision(instruction, job, snapshot, "Empty OpenAI response; fallback mock");
    }

    const parsed = JSON.parse(content) as AgentDecision;
    if (parsed.decision !== "APPLY" && parsed.decision !== "SKIP") {
      return mockDecision(instruction, job, snapshot, "Malformed decision format; fallback mock");
    }
    return parsed;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown LLM error";
    return mockDecision(instruction, job, snapshot, reason);
  }
}

export async function decideNavigation(
  instruction: AgentInstruction,
  snapshot: PageSnapshot
): Promise<NavigationDecision> {
  if (snapshot.pageType === "listing" && snapshot.nextPageSelector && snapshot.jobs.length === 0) {
    return { action: "NEXT_PAGE", reason: "No fresh jobs on the page; moving to next page" };
  }

  if (snapshot.searchForm?.submitSelector && snapshot.searchForm.keywordSelector) {
    return {
      action: "RUN_SEARCH",
      reason: `Found a job search form for ${instruction.role}`
    };
  }

  if (snapshot.navigationTargets.some((target) => /jobs|search/i.test(target.label))) {
    return {
      action: "OPEN_JOBS",
      reason: "Found a jobs/search navigation target on the current page"
    };
  }

  return { action: "STOP", reason: "No job navigation controls discovered on the current page" };
}

export function mockDecision(
  instruction: AgentInstruction,
  job: JobCard,
  snapshot: PageSnapshot,
  suffix = "keyword match"
): AgentDecision {
  const haystack =
    `${job.title} ${job.company} ${job.location} ${job.experienceText} ${job.skills.join(" ")} ${snapshot.pageText}`.toLowerCase();
  const roleMatch = haystack.includes(instruction.role.toLowerCase());
  const skillMatches = instruction.skills.filter((skill) => haystack.includes(skill.toLowerCase()));
  const locationMatch =
    instruction.locations.length === 0 ||
    instruction.locations.some((location) => haystack.includes(location.toLowerCase())) ||
    haystack.includes("remote");
  const quickApplyBias = job.easyApply || /easy apply|quick apply/.test(haystack);

  const shouldApply = (roleMatch || skillMatches.length >= 2) && locationMatch && quickApplyBias;

  return {
    decision: shouldApply ? "APPLY" : "SKIP",
    reason: shouldApply
      ? `Mock APPLY (${suffix}; matched ${skillMatches.length} skills and quick apply signals)`
      : `Mock SKIP (${suffix}; insufficient role/location/quick-apply match)`
  };
}

function readEnvApiKey(): string | undefined {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return maybeProcess?.env?.OPENAI_API_KEY;
}
