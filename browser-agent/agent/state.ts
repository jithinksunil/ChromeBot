export interface ExperienceRange {
  min: number;
  max: number;
}

export interface AgentInstruction {
  role: string;
  locations: string[];
  experienceRange: ExperienceRange;
  skills: string[];
  maxApplications: number;
  openaiApiKey?: string;
}

export interface JobCard {
  title: string;
  company: string;
  experienceText: string;
  location: string;
  skills: string[];
  applySelector?: string;
}

export interface AgentDecision {
  decision: "APPLY" | "SKIP";
  reason: string;
}

export interface AgentRuntimeState {
  isRunning: boolean;
  appliedCount: number;
  failures: number;
  lastReason?: string;
}

export interface AgentLogEntry {
  timestamp: string;
  title: string;
  company: string;
  decision: "APPLY" | "SKIP" | "ERROR";
  reason: string;
}
