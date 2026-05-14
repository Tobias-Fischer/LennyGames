export interface SavedWorld {
  version: number;
  addedBlocks: Array<{ x: number; y: number; z: number; typeId: string }>;
  removedInitialBlockKeys: string[];
}

export interface GameProgress {
  themeId: string;
  completedJobs: number;
  stars: number;
  badges: string[];
  unlockedDecorations: string[];
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

function progressKey(themeId: string): string {
  return `${storagePrefix}:${themeId}:progress`;
}

export function createEmptyProgress(themeId: string): GameProgress {
  return { themeId, completedJobs: 0, stars: 0, badges: [], unlockedDecorations: [] };
}

export function loadProgress(themeId: string): GameProgress {
  const raw = window.localStorage.getItem(progressKey(themeId));
  if (!raw) {
    return createEmptyProgress(themeId);
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GameProgress>;
    return {
      themeId,
      completedJobs: Number.isFinite(parsed.completedJobs) ? Number(parsed.completedJobs) : 0,
      stars: Number.isFinite(parsed.stars) ? Number(parsed.stars) : 0,
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((badge) => typeof badge === "string") : [],
      unlockedDecorations: Array.isArray(parsed.unlockedDecorations)
        ? parsed.unlockedDecorations.filter((decoration) => typeof decoration === "string")
        : []
    };
  } catch {
    return createEmptyProgress(themeId);
  }
}

export function saveProgress(progress: GameProgress): void {
  window.localStorage.setItem(progressKey(progress.themeId), JSON.stringify(progress));
}
