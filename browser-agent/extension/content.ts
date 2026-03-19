chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING_CONTENT") {
    sendResponse({
      ok: true,
      page: window.location.href,
      title: document.title,
      textPreview: document.body.innerText.slice(0, 500)
    });
  }
  return false;
});
