import { AgentInstruction } from "../agent/state";

export interface PopupFormValues {
  role: string;
  locations: string;
  experienceRange: string;
  skills: string;
  maxApplications: string;
  openaiKey?: string;
}

export function parseInstruction(values: PopupFormValues): AgentInstruction {
  const [minExpRaw, maxExpRaw] = values.experienceRange.split("-").map((segment) => Number(segment.trim()));
  const min = Number.isFinite(minExpRaw) ? minExpRaw : 0;
  const max = Number.isFinite(maxExpRaw) ? maxExpRaw : min;

  return {
    role: values.role.trim(),
    locations: splitCsv(values.locations),
    experienceRange: { min, max },
    skills: splitCsv(values.skills),
    maxApplications: Number(values.maxApplications),
    openaiApiKey: values.openaiKey?.trim() || undefined
  };
}

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
