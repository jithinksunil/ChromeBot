import { AgentInstruction } from "../agent/state";

export function validateInstruction(input: AgentInstruction): string[] {
  const errors: string[] = [];
  if (!input.role) errors.push("Role is required.");
  if (input.locations.length === 0) {
    errors.push("At least one location is required.");
  }
  if (input.skills.length === 0) {
    errors.push("At least one skill is required.");
  }
  if (input.experienceRange.min > input.experienceRange.max) {
    errors.push("Experience range is invalid.");
  }
  if (input.maxApplications < 1) {
    errors.push("Max applications must be >= 1.");
  }
  return errors;
}
