import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { importDeckFromFile } from "./actions";
import { mockApiCalls } from "./mocks";

const BUILT_DECK = "What the Fuck (94 Card Hell)";
const OTHER_DECK = "Subject 5U-21 Does It All (clone)";

test("move all decks to another browser", async ({ browser, page }) => {
  await mockApiCalls(page);
  await importDeckFromFile(page, "validation/versatile.json");
  await importDeckFromFile(page, "validation/required_quantity.json");

  const built = page.getByTestId(`collection-deck-${BUILT_DECK}`);
  await built.getByTestId("deck-built-toggle").click();
  await expect(built.getByTestId("deck-built-toggle")).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.getByTestId("collection-more-actions").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("collection-export-all").click();
  const download = await downloadPromise;
  const filePath = test.info().outputPath("decks.json");
  await download.saveAs(filePath);

  const bundle = JSON.parse(await readFile(filePath, "utf8"));
  expect(bundle.decks).toHaveLength(2);

  // A second browser context has its own storage, like another browser.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await mockApiCalls(otherPage);
  await otherPage.goto("/");

  const importFile = async () => {
    const chooser = otherPage.waitForEvent("filechooser");
    await otherPage.getByTestId("collection-more-actions").click();
    await otherPage.getByTestId("collection-import-button").click();
    await (await chooser).setFiles([filePath]);
  };

  await importFile();
  await expect(otherPage.getByText("Imported 2 decks.")).toBeVisible();

  // The built flag is kept when moving decks between your own browsers.
  await expect(
    otherPage
      .getByTestId(`collection-deck-${BUILT_DECK}`)
      .getByTestId("deck-built-toggle"),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    otherPage.getByTestId(`collection-deck-${OTHER_DECK}`),
  ).toBeVisible();

  // Importing the same file again skips the decks that already exist.
  await otherPage.mouse.move(0, 0);
  await importFile();
  await expect(
    otherPage.getByText("Imported 0 decks, skipped 2 already in this browser."),
  ).toBeVisible();
  await expect(otherPage.getByTestId("collection-deck")).toHaveCount(2);

  await other.close();
});
