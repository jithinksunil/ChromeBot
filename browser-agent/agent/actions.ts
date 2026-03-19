export async function openTab(url: string): Promise<number> {
  const tab = await chrome.tabs.create({ url });
  if (!tab.id) throw new Error("Failed to open tab");
  return tab.id;
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

export async function switchTab(tabId: number): Promise<void> {
  await chrome.tabs.update(tabId, { active: true });
}

export async function click(tabId: number, selector: string): Promise<void> {
  await runDomAction(
    tabId,
    ({ selector: sel }) => {
      const node = document.querySelector<HTMLElement>(sel);
      if (!node) return false;
      node.click();
      return true;
    },
    { selector }
  );
}

export async function typeText(
  tabId: number,
  selector: string,
  text: string
): Promise<void> {
  await runDomAction(
    tabId,
    ({ selector: sel, text: value }) => {
      const input = document.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(sel);
      if (!input) return false;
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
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

async function runDomAction<T>(
  tabId: number,
  fn: (args: T) => boolean,
  args: T
): Promise<void> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fn,
    args: [args]
  });

  if (!result?.result) {
    throw new Error("DOM action failed");
  }
}
