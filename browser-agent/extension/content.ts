import { parseCurrentPage, executeSemanticAction } from "../agent/domParser.js";
import { AgentAction } from "../agent/state.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OBSERVE_PAGE") {
    sendResponse({ ok: true, observation: parseCurrentPage() });
    return false;
  }

  if (message?.type === "EXECUTE_ACTION") {
    const payload = message.payload as AgentAction;
    if (payload.action === "NAVIGATE") {
      window.location.href = payload.url ?? payload.target ?? window.location.href;
      sendResponse({ ok: true, detail: "navigating" });
      return false;
    }

    const result = executeSemanticAction({
      action: payload.action === "STOP" ? "WAIT" : payload.action,
      target: payload.target,
      value: payload.value
    });
    sendResponse(result);
    return false;
  }

  if (message?.type === "PING_CONTENT") {
    const observation = parseCurrentPage();
    sendResponse({
      ok: true,
      page: observation.url,
      title: observation.title,
      pageType: observation.pageType,
      textPreview: observation.pageText.slice(0, 500)
    });
  }

  return false;
});
