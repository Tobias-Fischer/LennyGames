export interface SavedWorld {
  addedBlocks: Array<{ x: number; y: number; z: number; typeId: string }>;
  removedInitialBlockKeys: string[];
}

const storagePrefix = "police-and-crimes";

export function loadSavedWorld(themeId: string): SavedWorld {
  const raw = window.localStorage.getItem(`${storagePrefix}:${themeId}:world`);
  if (!raw) {
    return { addedBlocks: [], removedInitialBlockKeys: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedWorld>;
    return {
      addedBlocks: Array.isArray(parsed.addedBlocks) ? parsed.addedBlocks : [],
      removedInitialBlockKeys: Array.isArray(parsed.removedInitialBlockKeys)
        ? parsed.removedInitialBlockKeys
        : []
    };
  } catch {
    return { addedBlocks: [], removedInitialBlockKeys: [] };
  }
}

export function saveWorld(themeId: string, world: SavedWorld): void {
  window.localStorage.setItem(`${storagePrefix}:${themeId}:world`, JSON.stringify(world));
}

export function clearThemeSave(themeId: string): void {
  window.localStorage.removeItem(`${storagePrefix}:${themeId}:world`);
}
