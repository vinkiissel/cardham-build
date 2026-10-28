import { describe, expect, it } from "vitest";
import { getInitialSettings } from "../slices/settings";
import {
  activeCollectionProfile,
  collectionProfiles,
  createCollectionProfile,
  DEFAULT_COLLECTION_PROFILE,
  deleteCollectionProfile,
  renameCollectionProfile,
  switchCollectionProfile,
} from "./collection-profiles";

function settings() {
  return {
    ...getInitialSettings(),
    collection: { core: 1 },
    proxies: { "01037": 2 },
  };
}

describe("collection profiles", () => {
  it("treats the current collection as the default profile", () => {
    const s = settings();

    expect(activeCollectionProfile(s)).toEqual(DEFAULT_COLLECTION_PROFILE);
    expect(collectionProfiles(s)).toEqual({
      [DEFAULT_COLLECTION_PROFILE]: {
        name: "",
        collection: { core: 1 },
        proxies: { "01037": 2 },
      },
    });
  });

  it("creates an empty profile and switches to it", () => {
    const s = createCollectionProfile(settings(), "Friend's cards");
    const active = activeCollectionProfile(s);

    expect(active).not.toEqual(DEFAULT_COLLECTION_PROFILE);
    expect(s.collection).toEqual({});
    expect(s.proxies).toEqual({});
    expect(s.collectionProfiles?.[active].name).toEqual("Friend's cards");
    // The previous collection is kept in its profile.
    expect(s.collectionProfiles?.[DEFAULT_COLLECTION_PROFILE]).toMatchObject({
      collection: { core: 1 },
      proxies: { "01037": 2 },
    });
  });

  it("keeps changes to the active collection when switching", () => {
    let s = createCollectionProfile(settings(), "Second");
    const second = activeCollectionProfile(s);

    s = { ...s, collection: { dwl: 1 } };
    s = switchCollectionProfile(s, DEFAULT_COLLECTION_PROFILE);

    expect(s.collection).toEqual({ core: 1 });

    s = switchCollectionProfile(s, second);
    expect(s.collection).toEqual({ dwl: 1 });
  });

  it("renames the active profile", () => {
    const s = renameCollectionProfile(settings(), "Home");
    expect(collectionProfiles(s)[DEFAULT_COLLECTION_PROFILE].name).toEqual(
      "Home",
    );
  });

  it("deletes the active profile and loads another one", () => {
    let s = createCollectionProfile(settings(), "Second");
    s = { ...s, collection: { dwl: 1 } };
    s = deleteCollectionProfile(s);

    expect(activeCollectionProfile(s)).toEqual(DEFAULT_COLLECTION_PROFILE);
    expect(s.collection).toEqual({ core: 1 });
    expect(Object.keys(collectionProfiles(s))).toEqual([
      DEFAULT_COLLECTION_PROFILE,
    ]);
  });

  it("does not delete the last profile", () => {
    const s = settings();
    expect(deleteCollectionProfile(s)).toBe(s);
  });
});
