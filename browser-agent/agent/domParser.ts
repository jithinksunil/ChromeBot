import { JobCard, PageObservation, PageType, SemanticElement } from "./state.js";

export function parseCurrentPage(documentRef: Document = document): PageObservation {
  const pageText = cleanText(documentRef.body?.innerText ?? "").slice(0, 5000);
  const jobs = extractJobCards(documentRef);
  const elements = extractSemanticElements(documentRef, jobs);
  const pageType = detectPageType(documentRef, jobs, pageText);

  return {
    url: window.location.href,
    title: documentRef.title,
    pageType,
    elements,
    jobs,
    pageText,
    noResults: /no jobs|no results|0 jobs|nothing matched/i.test(pageText)
  };
}

export function executeSemanticAction(action: {
  action: "CLICK" | "TYPE" | "WAIT";
  target?: string;
  value?: string;
}): { ok: boolean; matchedText?: string; selector?: string; detail?: string } {
  if (action.action === "WAIT") {
    return { ok: true, detail: "wait acknowledged" };
  }

  const target = (action.target ?? "").trim();
  if (!target) {
    return { ok: false, detail: "Missing action target" };
  }

  const element = findBestElement(target, action.action === "TYPE" ? "input" : undefined);
  if (!element) {
    return { ok: false, detail: `No matching element found for ${target}` };
  }

  highlightElement(element);

  if (action.action === "TYPE") {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      return { ok: false, detail: "Matched element is not a text input" };
    }

    setNativeValue(element, action.value ?? "");
    return {
      ok: true,
      matchedText: readElementText(element),
      selector: buildSelector(element),
      detail: "typed text"
    };
  }

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.click();
  return {
    ok: true,
    matchedText: readElementText(element),
    selector: buildSelector(element),
    detail: "clicked element"
  };
}

function detectPageType(documentRef: Document, jobs: JobCard[], pageText: string): PageType {
  const url = `${window.location.pathname} ${documentRef.title}`.toLowerCase();
  const hasApplicationInputs = documentRef.querySelectorAll("input, textarea, select").length >= 3;
  const hasApplyCta = Array.from(documentRef.querySelectorAll("button, a")).some((node) =>
    /apply|submit application|send application/i.test(cleanText(node.textContent))
  );

  if (/home|dashboard|mnjuser/.test(url)) return "home";
  if (hasApplicationInputs && /apply|application/.test(pageText)) return "application_form";
  if (hasApplyCta && /job|description|company|about/i.test(pageText) && jobs.length <= 1) {
    return "job_detail";
  }
  if (jobs.length > 0 || /job-listings|jobs|search/.test(url)) return "job_listings";
  return "unknown";
}

function extractSemanticElements(documentRef: Document, jobs: JobCard[]): SemanticElement[] {
  const elements: SemanticElement[] = [];
  const seen = new Set<string>();

  const pushElement = (element: SemanticElement) => {
    const key = `${element.type}|${element.text}|${element.selector}`;
    if (!element.text || seen.has(key)) return;
    seen.add(key);
    elements.push(element);
  };

  Array.from(documentRef.querySelectorAll<HTMLElement>("a, button, input, textarea")).forEach(
    (node, index) => {
      const text = readElementText(node);
      const selector = buildSelector(node);
      const visible = isVisible(node);

      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        pushElement({
          id: `input-${index}`,
          type: "input",
          text: text || node.placeholder || node.name || node.id || `input-${index}`,
          name: node.name || undefined,
          placeholder: node.placeholder || undefined,
          selector,
          importance: /search|keyword|location|skill|designation/i.test(
            `${node.name} ${node.placeholder}`
          )
            ? "high"
            : "medium",
          visible,
          metadata: { inputType: node.getAttribute("type") ?? undefined }
        });
        return;
      }

      if (!text) return;
      const href = node instanceof HTMLAnchorElement ? node.href : undefined;
      const isNavigation = /jobs|search|apply|home|companies/i.test(text);
      pushElement({
        id: `${node.tagName.toLowerCase()}-${index}`,
        type: isNavigation ? "navigation" : node instanceof HTMLAnchorElement ? "link" : "button",
        text,
        role: node.getAttribute("role") ?? undefined,
        href,
        selector,
        importance: getImportance(text),
        visible,
        metadata: {
          quickApply: /easy apply|quick apply|apply/i.test(text),
          nav: isNavigation
        }
      });
    }
  );

  jobs.forEach((job, index) => {
    pushElement({
      id: `job-${index}`,
      type: "job_card",
      text: `${job.title} at ${job.company}`,
      href: job.href,
      selector: job.selector,
      importance: job.quickApply ? "high" : "medium",
      visible: true,
      metadata: {
        title: job.title,
        company: job.company,
        location: job.location,
        quickApply: job.quickApply
      }
    });
  });

  return elements.slice(0, 120);
}

function extractJobCards(documentRef: Document): JobCard[] {
  const cards = Array.from(
    documentRef.querySelectorAll<HTMLElement>("a, article, div, section, li")
  );
  const seen = new Set<string>();
  const jobs: JobCard[] = [];

  cards.forEach((card, index) => {
    const text = cleanText(card.innerText);
    if (!text || text.length < 20) return;

    const anchor = card.matches("a")
      ? (card as HTMLAnchorElement)
      : card.querySelector<HTMLAnchorElement>("a[href]");
    const href = anchor?.href;
    const hrefLooksJobLike = Boolean(href && /job|jobs|listing/i.test(href));
    const title = cleanText(
      anchor?.textContent || card.querySelector("h1,h2,h3,[title]")?.textContent || ""
    );
    const company = cleanText(
      card.querySelector("[class*='company'], a.comp-name, .comp-name")?.textContent || ""
    );
    const location = cleanText(
      card.querySelector("[class*='location'], .locWdth")?.textContent || ""
    );
    const hasJobSignals = /experience|apply|location|salary|remote/i.test(text);

    if ((!hrefLooksJobLike && !hasJobSignals) || !title) return;

    const id = `${title}|${company}|${href ?? index}`;
    if (seen.has(id)) return;
    seen.add(id);

    jobs.push({
      id,
      title,
      company: company || "Unknown company",
      location: location || "Not listed",
      experienceText: cleanText(
        card.querySelector("[class*='experience'], .expwdth")?.textContent || ""
      ),
      skills: Array.from(card.querySelectorAll<HTMLElement>("li, [class*='skill'], [class*='tag']"))
        .map((node) => cleanText(node.innerText))
        .filter(Boolean)
        .slice(0, 10),
      selector: buildSelector(anchor ?? card),
      href,
      quickApply: /easy apply|quick apply|apply now/i.test(text)
    });
  });

  return jobs.slice(0, 40);
}

function findBestElement(target: string, preferredType?: "input"): HTMLElement | null {
  const wanted = normalize(target);
  let best: HTMLElement | null = null;
  let bestScore = 0;

  Array.from(
    document.querySelectorAll<HTMLElement>("a, button, input, textarea, [role='button']")
  ).forEach((node) => {
    if (
      preferredType === "input" &&
      !(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    const text = normalize(readElementText(node));
    const attrs = normalize(
      [
        node.getAttribute("aria-label"),
        node.getAttribute("placeholder"),
        node.getAttribute("name"),
        node.id,
        text
      ]
        .filter(Boolean)
        .join(" ")
    );

    const score = similarityScore(wanted, attrs);
    if (score > bestScore) {
      best = node;
      bestScore = score;
    }
  });

  return bestScore >= 0.35 ? best : null;
}

function similarityScore(left: string, right: string): number {
  if (!left || !right) return 0;
  if (right.includes(left) || left.includes(right)) return 1;

  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return intersection / Math.max(leftTokens.size, rightTokens.size, 1);
}

function getImportance(text: string): "high" | "medium" | "low" {
  if (/jobs|search|apply|submit|next|continue/i.test(text)) return "high";
  if (/recommended|view all|details|profile/i.test(text)) return "medium";
  return "low";
}

function highlightElement(element: HTMLElement) {
  document.querySelectorAll("[data-chromebot-highlight='true']").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.style.outline = "";
      node.style.backgroundColor = "";
      node.removeAttribute("data-chromebot-highlight");
    }
  });

  element.setAttribute("data-chromebot-highlight", "true");
  element.style.outline = "3px solid #22c55e";
  element.style.backgroundColor = "rgba(34, 197, 94, 0.12)";
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as { value?: PropertyDescriptor };
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
  if (!descriptor?.set) {
    element.value = value;
  }
  element.focus();
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function readElementText(node: HTMLElement): string {
  return cleanText(
    node.innerText ||
      node.getAttribute("aria-label") ||
      node.getAttribute("placeholder") ||
      node.getAttribute("name") ||
      node.getAttribute("title") ||
      ""
  );
}

function isVisible(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function buildSelector(node: Element): string | undefined {
  if (!(node instanceof HTMLElement)) return undefined;
  if (node.id) return `#${cssEscape(node.id)}`;

  const parts: string[] = [];
  let current: HTMLElement | null = node;
  while (current && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    if (current.classList.length > 0) {
      part += `.${Array.from(current.classList).slice(0, 2).map(cssEscape).join(".")}`;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current?.tagName
      );
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    const candidate = parts.join(" > ");
    try {
      if (document.querySelector(candidate) === node) return candidate;
    } catch {
      // keep building the selector
    }
    current = current.parentElement;
  }

  return parts.join(" > ") || undefined;
}

function cssEscape(value: string): string {
  if ((globalThis as { CSS?: { escape?: (input: string) => string } }).CSS?.escape) {
    return CSS.escape(value);
  }
  return value.replace(/([ #;?%&,.+*~\':"!^$\[\]()=>|/@])/g, "\\$1");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return cleanText(value).toLowerCase();
}
