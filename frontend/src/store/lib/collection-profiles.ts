import type { CollectionProfile, Settings } from "@arkham-build/shared";
import { randomId } from "@/utils/crypto";

/**
 * Named collections ("profiles"). The active profile is mirrored in `settings.collection` and
 * `settings.proxies`, which the rest of the app reads. Switching profiles stores the active
 * collection in its profile and loads the selected one.
 */
export const DEFAULT_COLLECTION_PROFILE = "default";

export function activeCollectionProfile(settings: Settings) {
  return settings.activeCollectionProfile ?? DEFAULT_COLLECTION_PROFILE;
}

/**
 * All profiles, with the active profile's collection taken from the live settings.
 */
export function collectionProfiles(
  settings: Settings,
): Record<string, CollectionProfile> {
  const active = activeCollectionProfile(settings);

  return {
    ...settings.collectionProfiles,
    [active]: {
      name: settings.collectionProfiles?.[active]?.name ?? "",
      collection: settings.collection,
      proxies: settings.proxies ?? {},
    },
  };
}

export function switchCollectionProfile(
  settings: Settings,
  id: string,
): Settings {
  const profiles = collectionProfiles(settings);
  const next = profiles[id];
  if (!next) return settings;

  return {
    ...settings,
    activeCollectionProfile: id,
    collectionProfiles: profiles,
    collection: next.collection,
    proxies: next.proxies ?? {},
  };
}

export function createCollectionProfile(
  settings: Settings,
  name: string,
): Settings {
  const id = randomId();

  return switchCollectionProfile(
    {
      ...settings,
      collectionProfiles: {
        ...collectionProfiles(settings),
        [id]: { name, collection: {}, proxies: {} },
      },
    },
    id,
  );
}

export function renameCollectionProfile(
  settings: Settings,
  name: string,
): Settings {
  const profiles = collectionProfiles(settings);
  const active = activeCollectionProfile(settings);

  return {
    ...settings,
    collectionProfiles: {
      ...profiles,
      [active]: { ...profiles[active], name },
    },
  };
}

/**
 * Deletes the active profile and switches to another one. The last profile can not be deleted.
 */
export function deleteCollectionProfile(settings: Settings): Settings {
  const { [activeCollectionProfile(settings)]: _deleted, ...rest } =
    collectionProfiles(settings);

  const [nextId] = Object.keys(rest);
  if (!nextId) return settings;

  // Load the next profile directly: switching would store the deleted collection first.
  return {
    ...settings,
    activeCollectionProfile: nextId,
    collectionProfiles: rest,
    collection: rest[nextId].collection,
    proxies: rest[nextId].proxies ?? {},
  };
}
