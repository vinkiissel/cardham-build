import { expect, test } from "@playwright/test";
import { importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

const DECK_NAME = "What the Fuck (94 Card Hell)";

test.describe("deck build codes", () => {
  test("rebuild a deck in another browser", async ({ browser, page }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockApiCalls(page);
    await importDeckFromFile(page, "validation/versatile.json", {
      navigate: "view",
    });

    await page.getByTestId("deck-build-code-link").click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain("/import#ahb1.");

    await page.getByTestId("deck-build-code-copy").click();
    const code = await page.evaluate(() => navigator.clipboard.readText());
    expect(code.startsWith("ahb1.")).toBe(true);

    // A second browser context has its own storage, like another browser.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await mockApiCalls(otherPage);

    await otherPage.goto(link);
    await expect(otherPage).toHaveURL(/\/deck\/view\//);
    await expect(otherPage.getByTestId("view-title")).toContainText(DECK_NAME);

    // Codes can also be pasted into the import form.
    const third = await browser.newContext();
    const thirdPage = await third.newPage();
    await mockApiCalls(thirdPage);

    await thirdPage.goto("/");
    await thirdPage.getByTestId("import-trigger").click();
    await thirdPage.getByTestId("import-input").fill(code);
    await thirdPage.getByTestId("import-submit").click();

    await expect(
      thirdPage.getByTestId(`collection-deck-${DECK_NAME}`),
    ).toBeVisible();

    await other.close();
    await third.close();
  });
});
