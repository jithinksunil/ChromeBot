import { OPENAI_MODEL } from "../config/constants.js";
import { AgentAction, AgentInstruction, AgentRuntimeState, PageObservation } from "./state.js";

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function decideNextAction(
  instruction: AgentInstruction,
  observation: PageObservation,
  runtime: AgentRuntimeState
): Promise<AgentAction> {
  const apiKey = instruction.openaiApiKey ?? readEnvApiKey();
  if (!apiKey) {
    return heuristicDecision(
      instruction,
      observation,
      runtime,
      "OPENAI_API_KEY missing; using heuristic planner"
    );
  }

  try {
    const availableActions = buildActionHints(instruction, observation);
    const payload = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a browser automation decision engine for a Chrome extension. Choose exactly one next action that helps apply to matching jobs. Prefer Jobs navigation over recommended widgets, prefer primary CTAs, avoid ads/promotions, and stop when stuck. Return strict JSON only."
        },
        {
          role: "user",
          content: JSON.stringify({
            goal: `Apply to jobs matching role=${instruction.role}, locations=${instruction.locations.join(
              ", "
            )}, experience=${instruction.experienceRange.min}-${instruction.experienceRange.max}, skills=${instruction.skills.join(", ")}`,
            runtime,
            page: observation,
            availableActions
          })
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agent_action",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["action", "reason"],
            properties: {
              action: { type: "string", enum: ["CLICK", "TYPE", "NAVIGATE", "WAIT", "STOP"] },
              target: { type: "string" },
              value: { type: "string" },
              url: { type: "string" },
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
      return heuristicDecision(
        instruction,
        observation,
        runtime,
        `OpenAI API error: ${response.status}`
      );
    }

    const data = (await response.json()) as ChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return heuristicDecision(instruction, observation, runtime, "Empty OpenAI response");
    }

    const parsed = JSON.parse(content) as AgentAction;
    if (!["CLICK", "TYPE", "NAVIGATE", "WAIT", "STOP"].includes(parsed.action)) {
      return heuristicDecision(instruction, observation, runtime, "Invalid LLM action");
    }

    return parsed;
  } catch (error) {
    return heuristicDecision(
      instruction,
      observation,
      runtime,
      error instanceof Error ? error.message : "Unknown LLM error"
    );
  }
}

function heuristicDecision(
  instruction: AgentInstruction,
  observation: PageObservation,
  runtime: AgentRuntimeState,
  suffix: string
): AgentAction {
  const getElement = (pattern: RegExp) =>
    observation.elements.find((element) => element.visible && pattern.test(element.text));

  if (observation.pageType === "home" || observation.pageType === "unknown") {
    const jobsNav = getElement(/^jobs/i);
    if (jobsNav) {
      return {
        action: "CLICK",
        target: jobsNav.text,
        reason: `Move from home to job listings (${suffix})`
      };
    }

    const searchInput = observation.elements.find(
      (element) =>
        element.type === "input" && /search|keyword|skill|designation/i.test(element.text)
    );
    if (searchInput && runtime.lastAction?.action !== "TYPE") {
      return {
        action: "TYPE",
        target: searchInput.text,
        value: instruction.role,
        reason: `Fill the role search input before listing navigation (${suffix})`
      };
    }
  }

  if (observation.pageType === "job_listings") {
    const jobMatch = observation.jobs.find((job) => matchesJob(instruction, job));
    if (jobMatch) {
      return {
        action: jobMatch.href ? "NAVIGATE" : "CLICK",
        target: jobMatch.title,
        url: jobMatch.href,
        reason: `Open a matching job listing for ${jobMatch.title} (${suffix})`
      };
    }

    const nextButton = getElement(/next|show more|more jobs/i);
    if (nextButton) {
      return {
        action: "CLICK",
        target: nextButton.text,
        reason: `Move to more listings (${suffix})`
      };
    }

    if (observation.noResults) {
      return { action: "STOP", reason: `No matching jobs were found (${suffix})` };
    }
  }

  if (observation.pageType === "job_detail" || observation.pageType === "application_form") {
    const applyButton = getElement(
      /easy apply|quick apply|apply|submit application|send application/i
    );
    if (applyButton) {
      return {
        action: "CLICK",
        target: applyButton.text,
        reason: `Proceed with the apply flow (${suffix})`
      };
    }

    const inputToFill = observation.elements.find(
      (element) =>
        element.type === "input" && /skill|keyword|name|email|phone|location/i.test(element.text)
    );
    if (inputToFill && runtime.lastAction?.action !== "TYPE") {
      return {
        action: "TYPE",
        target: inputToFill.text,
        value: buildInputValue(instruction, inputToFill.text),
        reason: `Fill a visible application input (${suffix})`
      };
    }
  }

  if (runtime.iterations >= 12) {
    return { action: "STOP", reason: `Stopping after repeated attempts (${suffix})` };
  }

  return { action: "WAIT", reason: `No confident action found yet (${suffix})` };
}

function buildActionHints(instruction: AgentInstruction, observation: PageObservation): string[] {
  const hints = observation.elements
    .slice(0, 25)
    .map((element) => `${element.type}:${element.text}`);
  const preferredJob = observation.jobs.find((job) => matchesJob(instruction, job));
  if (preferredJob) {
    hints.unshift(`preferred_job:${preferredJob.title} at ${preferredJob.company}`);
  }
  return hints;
}

function matchesJob(instruction: AgentInstruction, job: PageObservation["jobs"][number]): boolean {
  const haystack =
    `${job.title} ${job.company} ${job.location} ${job.experienceText ?? ""} ${job.skills.join(" ")}`.toLowerCase();
  const roleMatch = haystack.includes(instruction.role.toLowerCase());
  const skillMatches = instruction.skills.filter((skill) =>
    haystack.includes(skill.toLowerCase())
  ).length;
  const locationMatch =
    instruction.locations.length === 0 ||
    instruction.locations.some((location) => haystack.includes(location.toLowerCase())) ||
    haystack.includes("remote");
  return locationMatch && (roleMatch || skillMatches >= 1 || job.quickApply);
}

function buildInputValue(instruction: AgentInstruction, fieldText: string): string {
  if (/skill|keyword|designation|role/i.test(fieldText)) return instruction.role;
  if (/location|city/i.test(fieldText)) return instruction.locations[0] ?? "";
  if (/name/i.test(fieldText)) return "ChromeBot User";
  if (/email/i.test(fieldText)) return "user@example.com";
  if (/phone|mobile/i.test(fieldText)) return "9999999999";
  return instruction.skills[0] ?? instruction.role;
}

function readEnvApiKey(): string | undefined {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return maybeProcess?.env?.OPENAI_API_KEY;
}
