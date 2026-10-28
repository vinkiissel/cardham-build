import { describe, expect, it } from "vitest";
import { selectDecksDisplayList } from "@/store/selectors/deck-collection";
import { makeTestDeck } from "@/test/factories";
import { getMockStore } from "@/test/get-mock-store";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";

function withoutSections(result: ReturnType<typeof selectDecksDisplayList>) {
  return {
    ...result,
    entries: result.entries.filter((entry) => entry.type !== "section"),
  };
}

describe("selectDecksDisplayList", () => {
  it("lists built decks before unbuilt decks", async () => {
    const store = await getMockStore();

    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          unbuilt: makeTestDeck({ id: "unbuilt" }),
          built: makeTestDeck({
            id: "built",
            meta: JSON.stringify({ built: "true" }),
          }),
        },
        history: {
          unbuilt: [],
          built: [],
        },
        folders: {},
        deckFolders: {},
      },
    });

    const result = selectDecksDisplayList(store.getState());

    expect(
      result.entries.map((entry) =>
        entry.type === "deck" ? entry.deck.id : entry.type,
      ),
    ).toEqual(["section", "built", "section", "unbuilt"]);

    expect(result.entries[0]).toMatchObject({ section: "built", count: 1 });
    expect(result.entries[2]).toMatchObject({ section: "unbuilt", count: 1 });
  });

  it("ignores unknown folder refs without crashing", async () => {
    const store = await getMockStore();

    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          deck: makeTestDeck({ id: "deck" }),
        },
        history: {
          deck: [],
        },
        deckFolders: {
          deck: "missing-folder",
        },
      },
    });

    const result = withoutSections(selectDecksDisplayList(store.getState()));

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      type: "deck",
      depth: 0,
      deck: {
        id: "deck",
      },
    });
  });

  it("renders archive even when the archive folder is not stored", async () => {
    const store = await getMockStore();

    store.setState({
      data: {
        ...store.getState().data,
        decks: {
          deck: makeTestDeck({ id: "deck" }),
        },
        history: {
          deck: [],
        },
        folders: {},
        deckFolders: {
          deck: ARCHIVE_FOLDER_ID,
        },
      },
      deckCollection: {
        ...store.getState().deckCollection,
        expandedFolders: {
          [ARCHIVE_FOLDER_ID]: true,
        },
      },
    });

    const result = withoutSections(selectDecksDisplayList(store.getState()));

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      type: "folder",
      depth: 0,
      folder: {
        id: ARCHIVE_FOLDER_ID,
      },
    });
    expect(result.entries[1]).toMatchObject({
      type: "deck",
      depth: 1,
      folder: {
        id: ARCHIVE_FOLDER_ID,
      },
      deck: {
        id: "deck",
      },
    });
  });
});
