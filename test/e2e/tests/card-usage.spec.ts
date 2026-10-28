import { expect, test } from "@playwright/test";
import { importDeckFromFile, locateCardInSlots } from "./actions";
import { mockApiCalls } from "./mocks";

const BUILT_DECK = "What the Fuck (94 Card Hell)";
const OTHER_DECK = "Subject 5U-21 Does It All (clone)";

test.beforeEach(async ({ page }) => {
  await mockApiCalls(page);
  await importDeckFromFile(page, "validation/versatile.json");
  await importDeckFromFile(page, "validation/required_quantity.json");
});

test.describe("card usage", () => {
  test("built decks are listed first and mark their cards as in use", async ({
    page,
  }) => {
    const builtSection = page.getByTestId("collection-section-built");
    const unbuiltSection = page.getByTestId("collection-section-unbuilt");

    await expect(builtSection).toContainText("0");
    await expect(unbuiltSection).toContainText("2");

    const builtDeck = page.getByTestId(`collection-deck-${BUILT_DECK}`);
    const toggle = builtDeck.getByTestId("deck-built-toggle");

    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await expect(builtSection).toContainText("1");
    await expect(unbuiltSection).toContainText("1");

    // The built deck is rendered between the two section headers.
    const order = await page
      .locator(
        "[data-testid^='collection-section-'], [data-testid^='collection-deck-']",
      )
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.testid));

    expect(order).toEqual([
      "collection-section-built",
      `collection-deck-${BUILT_DECK}`,
      "collection-section-unbuilt",
      `collection-deck-${OTHER_DECK}`,
    ]);

    // Working a Hunch: 2 copies in the built deck.
    // Move the pointer off the reordered list so hover actions do not cover the deck.
    await page.mouse.move(0, 0);
    await page.getByTestId(`collection-deck-${OTHER_DECK}`).click();
    await page.getByTestId("view-edit").click();

    await expect(
      locateCardInSlots(page, "01037").getByTestId("card-usage"),
    ).toHaveText("2");

    // Cards that are not used by built decks are not highlighted.
    await expect(
      locateCardInSlots(page, "01019").getByTestId("card-usage"),
    ).toHaveCount(0);
  });

  test("the built deck does not count against itself", async ({ page }) => {
    const builtDeck = page.getByTestId(`collection-deck-${BUILT_DECK}`);
    await builtDeck.getByTestId("deck-built-toggle").click();
    await expect(builtDeck.getByTestId("deck-built-toggle")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.mouse.move(0, 0);
    await builtDeck.getByTestId("deck-summary-title").click();
    await page.getByTestId("view-edit").click();

    await expect(
      locateCardInSlots(page, "01037").getByTestId("card-usage"),
    ).toHaveCount(0);
  });

  test("single cards are added to the card pool", async ({ page }) => {
    const builtDeck = page.getByTestId(`collection-deck-${BUILT_DECK}`);
    await builtDeck.getByTestId("deck-built-toggle").click();
    await expect(builtDeck.getByTestId("deck-built-toggle")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("tab-collection").click();
    await page.getByTestId("settings-show-all").click();

    const proxies = page.getByTestId("settings-proxies");
    await proxies.getByTestId("combobox-input").click();
    await proxies.getByTestId("combobox-input").fill("Working a Hunch");
    await page.getByTestId("combobox-menu-item-01037").click();
    await expect(proxies.getByTestId("listcard-01037")).toBeVisible();

    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await page.mouse.move(0, 0);
    await page.getByTestId(`collection-deck-${OTHER_DECK}`).click();
    await page.getByTestId("view-edit").click();

    // One owned copy, two used by the built deck: none left for this deck.
    await expect(
      locateCardInSlots(page, "01037").getByTestId("card-usage"),
    ).toHaveText("0/1");
  });

  test("built decks are highlighted and list cards missing from the collection", async ({
    page,
  }) => {
    for (const name of [BUILT_DECK, OTHER_DECK]) {
      const deck = page.getByTestId(`collection-deck-${name}`);
      await deck.getByTestId("deck-built-toggle").click();
      await expect(deck.getByTestId("deck-built-toggle")).toHaveAttribute(
        "aria-checked",
        "true",
      );
    }

    // All cards count as owned until the collection is configured.
    const builtDeck = page
      .getByTestId(`collection-deck-${BUILT_DECK}`)
      .getByTestId("collection-deck");
    await expect(builtDeck).toHaveAttribute("data-built-status", "ok");
    await expect(builtDeck.getByTestId("built-deck-conflicts")).toHaveCount(0);

    await page.getByTestId("masthead-settings").click();
    await page.getByTestId("tab-collection").click();
    await page.getByTestId("settings-show-all").click();
    await page.getByTestId("settings-save").click();
    await page.getByTestId("settings-back").click();

    await expect(builtDeck).toHaveAttribute("data-built-status", "conflict");

    await builtDeck.getByTestId("built-deck-conflicts").click();
    const list = page.getByTestId("built-deck-conflicts-list");
    await expect(list).toContainText("Working a Hunch");
    await expect(list).toContainText(OTHER_DECK);
  });
});
