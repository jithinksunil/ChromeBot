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

export interface SearchFormContext {
  keywordSelector?: string;
  locationSelector?: string;
  submitSelector?: string;
}

export interface NavigationTarget {
  label: string;
  selector: string;
  href?: string;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  experienceText: string;
  location: string;
  skills: string[];
  href?: string;
  easyApply: boolean;
  applySelector?: string;
  cardSelector?: string;
  titleSelector?: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  pageType: "listing" | "detail" | "other";
  jobs: JobCard[];
  applySelectors: string[];
  closeSelectors: string[];
  nextPageSelector?: string;
  searchForm?: SearchFormContext;
  navigationTargets: NavigationTarget[];
  pageText: string;
}

export interface AgentDecision {
  decision: "APPLY" | "SKIP";
  reason: string;
}

export interface NavigationDecision {
  action: "OPEN_JOBS" | "RUN_SEARCH" | "NEXT_PAGE" | "STOP";
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
