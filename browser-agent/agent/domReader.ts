import { PageSnapshot } from "./state.js";

export async function readPageSnapshot(tabId: number): Promise<PageSnapshot> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const textSelectors = [
        ".styles_job-listing-container__*",
        ".job-details-job-description",
        ".jdContainer",
        "main",
        "body"
      ];

      const listingSelectorCandidates = [
        ".srp-jobtuple-wrapper",
        ".cust-job-tuple",
        "[data-job-id]",
        "[data-testid*='jobTuple']"
      ];
      const fallbackSelectorCandidates = ["article", "section"];

      function cssEscape(value: string): string {
        if ((globalThis as { CSS?: { escape?: (input: string) => string } }).CSS?.escape) {
          return CSS.escape(value);
        }

        return value.replace(/([ #;?%&,.+*~\':"!^$\[\]()=>|/@])/g, "\\$1");
      }

      function selectorFor(element: Element | null): string | undefined {
        if (!element || !(element instanceof HTMLElement)) return undefined;
        if (element.id) return `#${cssEscape(element.id)}`;

        const parts: string[] = [];
        let current: Element | null = element;

        while (current && current instanceof HTMLElement && parts.length < 5) {
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
              const index = siblings.indexOf(current) + 1;
              part += `:nth-of-type(${index})`;
            }
          }

          parts.unshift(part);
          current = current.parentElement;

          const candidate = parts.join(" > ");
          try {
            if (document.querySelector(candidate) === element) return candidate;
          } catch {
            // ignore invalid selector candidate and continue building
          }
        }

        return parts.join(" > ") || undefined;
      }

      function cleanText(value: string | null | undefined): string {
        return value?.replace(/\s+/g, " ").trim() ?? "";
      }

      function getPageText(): string {
        for (const selector of textSelectors) {
          if (selector.includes("*")) continue;
          const node = document.querySelector<HTMLElement>(selector);
          if (node) return cleanText(node.innerText).slice(0, 4000);
        }

        return cleanText(document.body.innerText).slice(0, 4000);
      }

      function detectJobs() {
        const seen = new Set<string>();
        const urlHint = `${window.location.pathname} ${document.title}`.toLowerCase();
        const allowFallbackCards = /jobs|job-listings|search/.test(urlHint);
        const cards = [
          ...listingSelectorCandidates.flatMap((selector) =>
            Array.from(document.querySelectorAll<HTMLElement>(selector))
          ),
          ...(allowFallbackCards
            ? fallbackSelectorCandidates.flatMap((selector) =>
                Array.from(document.querySelectorAll<HTMLElement>(selector))
              )
            : [])
        ];

        return cards
          .map((card) => {
            const titleLink = card.querySelector<HTMLAnchorElement>(
              'a[title], a.title, a[href*="/job-listings"], a'
            );
            const title =
              cleanText(titleLink?.textContent) ||
              cleanText(card.querySelector("h1,h2,a")?.textContent);
            const company = cleanText(
              card.querySelector(
                "a.comp-name, .comp-name, [class*='company'], [data-testid*='company']"
              )?.textContent
            );
            const experienceText = cleanText(
              card.querySelector(".expwdth, [class*='experience'], [title*='year']")?.textContent
            );
            const location = cleanText(
              card.querySelector(
                ".locWdth, [class*='location'], [title*='India'], [title*='Remote']"
              )?.textContent
            );
            const skills = Array.from(
              card.querySelectorAll<HTMLElement>(".tags-gt li, [class*='tag'], [class*='skill']")
            )
              .map((node) => cleanText(node.innerText))
              .filter(Boolean)
              .slice(0, 10);
            const applyButton = Array.from(card.querySelectorAll<HTMLElement>("button, a")).find(
              (node) => /apply|easy apply|quick apply/i.test(cleanText(node.textContent))
            );
            const easyApply =
              Boolean(applyButton) || /easy apply|quick apply/i.test(cleanText(card.innerText));
            const href = titleLink?.href;
            const id = `${title}|${company}|${href ?? location}`;

            if (!title || seen.has(id)) return undefined;
            seen.add(id);

            return {
              id,
              title,
              company: company || "Unknown company",
              experienceText: experienceText || "Not listed",
              location: location || "Not listed",
              skills,
              href,
              easyApply,
              applySelector: selectorFor(applyButton ?? null),
              cardSelector: selectorFor(card),
              titleSelector: selectorFor(titleLink)
            };
          })
          .filter(Boolean);
      }

      function getApplySelectors(): string[] {
        const selectors = [
          "button[aria-label*='Apply' i]",
          "button[title*='Apply' i]",
          "button",
          "a"
        ];
        const found: string[] = [];

        selectors.forEach((selector) => {
          document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
            const text = cleanText(node.textContent);
            if (/apply|easy apply|quick apply|submit application|send application/i.test(text)) {
              const resolved = selectorFor(node ?? null);
              if (resolved && !found.includes(resolved)) found.push(resolved);
            }
          });
        });

        return found.slice(0, 8);
      }

      function getCloseSelectors(): string[] {
        const found: string[] = [];
        document.querySelectorAll<HTMLElement>("button, [role='button']").forEach((node) => {
          const text = cleanText(node.textContent);
          if (/close|cancel|dismiss|skip/i.test(text)) {
            const resolved = selectorFor(node ?? null);
            if (resolved && !found.includes(resolved)) found.push(resolved);
          }
        });
        return found.slice(0, 5);
      }

      function getSearchForm() {
        const keywordInput = document.querySelector<HTMLInputElement>(
          "input[placeholder*='skill' i], input[placeholder*='designation' i], input[placeholder*='keyword' i], input[placeholder*='Search jobs' i], input[type='search']"
        );
        const locationInput = document.querySelector<HTMLInputElement>(
          "input[placeholder*='location' i], input[placeholder*='city' i]"
        );
        const submitButton = Array.from(document.querySelectorAll<HTMLElement>("button, a")).find(
          (node) => /search|find jobs|jobs/i.test(cleanText(node.textContent))
        );

        if (!keywordInput && !submitButton) return undefined;

        return {
          keywordSelector: selectorFor(keywordInput),
          locationSelector: selectorFor(locationInput),
          submitSelector: selectorFor(submitButton ?? null)
        };
      }

      function getNavigationTargets() {
        const targets: Array<{ label: string; selector: string; href?: string; priority: number }> =
          [];

        Array.from(
          document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a, button")
        ).forEach((node) => {
          const label = cleanText(node.textContent);
          if (!label || !/jobs|search|recommended|next/i.test(label)) return;

          const selector = selectorFor(node);
          if (!selector) return;

          const priority = /^jobs/i.test(label)
            ? 3
            : /search/i.test(label)
              ? 2
              : /recommended|next/i.test(label)
                ? 1
                : 0;

          targets.push({
            label,
            selector,
            href: node instanceof HTMLAnchorElement ? node.href : undefined,
            priority
          });
        });

        return targets
          .sort((left, right) => right.priority - left.priority)
          .map(({ label, selector, href }) => ({ label, selector, href }))
          .slice(0, 20);
      }

      const jobs = detectJobs();
      const nextPageNode =
        Array.from(document.querySelectorAll<HTMLElement>("a, button")).find((node) =>
          /next/i.test(cleanText(node.textContent))
        ) ?? null;
      const urlText = `${window.location.pathname} ${document.title}`.toLowerCase();
      const isHomePage = /home|mnjuser|dashboard/.test(urlText);
      const isListingPage =
        !isHomePage &&
        (jobs.length > 0 || /jobs|search/.test(urlText)) &&
        Boolean(
          document.querySelector(
            ".srp-jobtuple-wrapper, .cust-job-tuple, [data-job-id], [data-testid*='jobTuple'], [class*='jobTuple']"
          )
        );
      const isDetailPage =
        Boolean(getApplySelectors().length) && /job|apply/.test(urlText) && !isListingPage;
      const pageType = isListingPage ? "listing" : isDetailPage ? "detail" : "other";

      return {
        url: window.location.href,
        title: document.title,
        pageType,
        jobs,
        applySelectors: getApplySelectors(),
        closeSelectors: getCloseSelectors(),
        nextPageSelector: selectorFor(nextPageNode),
        searchForm: getSearchForm(),
        navigationTargets: getNavigationTargets(),
        pageText: getPageText()
      };
    }
  });

  return result?.result as PageSnapshot;
}
