import { JobCard } from "./state";

export async function readJobCards(tabId: number): Promise<JobCard[]> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(".srp-jobtuple-wrapper")
      );

      return cards.map((card) => {
        const title =
          card.querySelector<HTMLElement>("a.title")?.innerText?.trim() ??
          "Unknown role";
        const company =
          card.querySelector<HTMLElement>("a.comp-name")?.innerText?.trim() ??
          "Unknown company";
        const experienceText =
          card.querySelector<HTMLElement>(".expwdth")?.innerText?.trim() ??
          "Not listed";
        const location =
          card.querySelector<HTMLElement>(".locWdth")?.innerText?.trim() ??
          "Not listed";
        const skills = Array.from(
          card.querySelectorAll<HTMLElement>(".tags-gt li")
        ).map((node) => node.innerText.trim());

        return {
          title,
          company,
          experienceText,
          location,
          skills,
          applySelector: "button.apply-button"
        };
      });
    }
  });

  return (result?.result as JobCard[]) ?? [];
}
