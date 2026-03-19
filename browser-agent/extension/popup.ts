import { parseInstruction } from "../utils/parser";
import { validateInstruction } from "../utils/validator";

const form = document.getElementById("job-form") as HTMLFormElement;
const stopButton = document.getElementById("stop-btn") as HTMLButtonElement;
const statusView = document.getElementById("status") as HTMLPreElement;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const parsed = parseInstruction({
    role: String(formData.get("role") ?? ""),
    locations: String(formData.get("locations") ?? ""),
    experienceRange: String(formData.get("experienceRange") ?? ""),
    skills: String(formData.get("skills") ?? ""),
    maxApplications: String(formData.get("maxApplications") ?? "10"),
    openaiKey: String(formData.get("openaiKey") ?? "")
  });

  const errors = validateInstruction(parsed);
  if (errors.length > 0) {
    statusView.textContent = `Validation failed:\n- ${errors.join("\n- ")}`;
    return;
  }

  statusView.textContent = "Starting agent...";
  const response = await chrome.runtime.sendMessage({ type: "AGENT_START", payload: parsed }) as {
    ok: boolean;
    result?: { appliedCount: number; failures: number; lastReason?: string };
    error?: string;
  };

  if (!response.ok) {
    statusView.textContent = `Start failed: ${response.error ?? "Unknown error"}`;
    return;
  }

  statusView.textContent = `Completed. Applied: ${response.result?.appliedCount ?? 0}\nFailures: ${response.result?.failures ?? 0}\nNote: ${response.result?.lastReason ?? "N/A"}`;
});

stopButton.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "AGENT_STOP" });
  statusView.textContent = "Stopped by user.";
});
