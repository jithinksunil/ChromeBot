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

export type PageType = "home" | "job_listings" | "job_detail" | "application_form" | "unknown";
export type SemanticElementType = "button" | "link" | "input" | "job_card" | "navigation";
export type Importance = "high" | "medium" | "low";
export type AgentActionType = "CLICK" | "TYPE" | "NAVIGATE" | "WAIT" | "STOP";
export type PipelineStage = "SYSTEM" | "OBSERVE" | "DECIDE" | "ACT" | "ERROR";

export interface SemanticElement {
  id: string;
  type: SemanticElementType;
  text: string;
  role?: string;
  href?: string;
  name?: string;
  placeholder?: string;
  selector?: string;
  importance: Importance;
  visible: boolean;
  metadata?: Record<string, string | boolean | number | undefined>;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  location: string;
  experienceText?: string;
  skills: string[];
  selector?: string;
  href?: string;
  quickApply: boolean;
}

export interface PageObservation {
  url: string;
  title: string;
  pageType: PageType;
  elements: SemanticElement[];
  jobs: JobCard[];
  pageText: string;
  noResults: boolean;
}

export interface AgentAction {
  action: AgentActionType;
  target?: string;
  value?: string;
  url?: string;
  reason: string;
}

export interface ExecutionResult {
  ok: boolean;
  matchedText?: string;
  selector?: string;
  detail?: string;
}

export interface AgentRuntimeState {
  isRunning: boolean;
  appliedCount: number;
  failures: number;
  iterations: number;
  lastReason?: string;
  lastPageType?: PageType;
  lastAction?: AgentAction;
}

export interface AgentLogEntry {
  timestamp: string;
  iteration: number;
  stage: PipelineStage;
  pageType: PageType;
  pageTitle: string;
  action?: AgentActionType;
  target?: string;
  reason: string;
  success: boolean;
  detail?: string;
}
