export interface SavedWorld {
  version: number;
  addedBlocks: Array<{ x: number; y: number; z: number; typeId: string }>;
  removedInitialBlockKeys: string[];
}

const storagePrefix = "police-and-crimes";

function worldKey(themeId: string, version: number): string {
  return `${storagePrefix}:${themeId}:v${version}:world`;
}

function legacyWorldKey(themeId: string): string {
  return `${storagePrefix}:${themeId}:world`;
}

export function createEmptyWorld(version: number): SavedWorld {
  return { version, addedBlocks: [], removedInitialBlockKeys: [] };
}

export function loadSavedWorld(themeId: string, version: number): SavedWorld {
  const raw = window.localStorage.getItem(worldKey(themeId, version)) ?? window.localStorage.getItem(legacyWorldKey(themeId));
  if (!raw) {
    return createEmptyWorld(version);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedWorld>;
    if (parsed.version !== version) {
      saveWorld(themeId, createEmptyWorld(version));
      return createEmptyWorld(version);
    }
    return {
      version,
      addedBlocks: Array.isArray(parsed.addedBlocks) ? parsed.addedBlocks : [],
      removedInitialBlockKeys: Array.isArray(parsed.removedInitialBlockKeys)
        ? parsed.removedInitialBlockKeys
        : []
    };
  } catch {
    return createEmptyWorld(version);
  }
}

export function saveWorld(themeId: string, world: SavedWorld): void {
  window.localStorage.setItem(worldKey(themeId, world.version), JSON.stringify(world));
}

export function clearThemeSave(themeId: string): void {
  Object.keys(window.localStorage)
    .filter((key) => key === legacyWorldKey(themeId) || key.startsWith(`${storagePrefix}:${themeId}:v`))
    .forEach((key) => window.localStorage.removeItem(key));
}
