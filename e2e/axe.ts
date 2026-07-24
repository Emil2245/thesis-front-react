import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function sinViolacionesA11y(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const graves = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(
    graves,
    `Violaciones a11y:\n${graves.map((v) => `- ${v.id}: ${v.help}`).join("\n")}`,
  ).toEqual([]);
}
