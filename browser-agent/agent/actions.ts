export async function click(tabId: number, selector: string): Promise<void> {
  await runDomAction(
    tabId,
    ({ selector: sel }) => {
      const node = document.querySelector<HTMLElement>(sel);
      if (!node) return false;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.click();
      return true;
    },
    { selector }
  );
}

export async function typeText(tabId: number, selector: string, text: string): Promise<void> {
  await runDomAction(
    tabId,
    ({ selector: sel, text: value }) => {
      const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel);
      if (!input) return false;
      input.focus();
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    { selector, text }
  );
}

export async function scroll(tabId: number, y = 500): Promise<void> {
  await runDomAction(
    tabId,
    ({ distance }) => {
      window.scrollBy({ top: distance, behavior: "smooth" });
      return true;
    },
    { distance: y }
  );
}

export async function navigateTab(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url });
  await waitForTabComplete(tabId);
}

export async function goBack(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.history.back()
  });
  await waitForTabComplete(tabId, 1500);
}

export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDomAction<T>(tabId: number, fn: (args: T) => boolean, args: T): Promise<void> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fn,
    args: [args]
  });

  if (!result?.result) {
    throw new Error("DOM action failed");
  }
}

async function waitForTabComplete(tabId: number, settleMs = 1000): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(done, 15000);

    function done() {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(resolve, settleMs);
    }

    function listener(updatedTabId: number, changeInfo: { status?: string }) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        done();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}
