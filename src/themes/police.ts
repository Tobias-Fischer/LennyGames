import type { SpawnBlock, ThemePack } from "../game/types";

const blocks: SpawnBlock[] = [];

function addBlock(x: number, y: number, z: number, typeId: string, protectedBlock = false): void {
  blocks.push({ x, y, z, typeId, protected: protectedBlock });
}

function addFloor(x1: number, x2: number, z1: number, z2: number, typeId: string, protectedBlock = false): void {
  for (let x = x1; x <= x2; x += 1) {
    for (let z = z1; z <= z2; z += 1) {
      addBlock(x, 0, z, typeId, protectedBlock);
    }
  }
}

function addWalls(
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  height: number,
  typeId: string,
  protectedBlock = false,
  doorAt?: { side: "north" | "south" | "east" | "west"; start: number; end: number }
): void {
  for (let y = 1; y <= height; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const southDoor = doorAt?.side === "south" && x >= doorAt.start && x <= doorAt.end && y <= 2;
      const northDoor = doorAt?.side === "north" && x >= doorAt.start && x <= doorAt.end && y <= 2;
      if (!southDoor) {
        addBlock(x, y, z1, typeId, protectedBlock);
      }
      if (!northDoor) {
        addBlock(x, y, z2, typeId, protectedBlock);
      }
    }
    for (let z = z1 + 1; z <= z2 - 1; z += 1) {
      const westDoor = doorAt?.side === "west" && z >= doorAt.start && z <= doorAt.end && y <= 2;
      const eastDoor = doorAt?.side === "east" && z >= doorAt.start && z <= doorAt.end && y <= 2;
      if (!westDoor) {
        addBlock(x1, y, z, typeId, protectedBlock);
      }
      if (!eastDoor) {
        addBlock(x2, y, z, typeId, protectedBlock);
      }
    }
  }
}

function addFlatRoof(x1: number, x2: number, z1: number, z2: number, y: number, typeId: string): void {
  for (let x = x1; x <= x2; x += 1) {
    for (let z = z1; z <= z2; z += 1) {
      addBlock(x, y, z, typeId, true);
    }
  }
}

function addSign(x: number, y: number, z: number, width: number, typeId: string): void {
  for (let i = 0; i < width; i += 1) {
    addBlock(x + i, y, z, typeId, true);
  }
}

addFloor(-9, -2, 3, 9, "station-floor", true);
addWalls(-9, -2, 3, 9, 3, "station-wall", true, { side: "south", start: -6, end: -5 });
addFlatRoof(-9, -2, 3, 9, 4, "station-roof");
addSign(-7, 3, 2, 3, "police-blue");
addBlock(-6, 1, 2, "door", true);
addBlock(-5, 1, 2, "door", true);

addFloor(-11, -8, 8, 12, "jail-floor", true);
addWalls(-11, -8, 8, 12, 3, "jail-wall", true, { side: "east", start: 9, end: 10 });
addFlatRoof(-11, -8, 8, 12, 4, "jail-roof");
for (let z = 9; z <= 11; z += 1) {
  addBlock(-8, 1, z, "bars", true);
  addBlock(-8, 2, z, "bars", true);
}

addFloor(6, 11, -13, -8, "shop-floor", true);
addWalls(6, 11, -13, -8, 3, "shop-wall", true, { side: "west", start: -11, end: -10 });
addFlatRoof(6, 11, -13, -8, 4, "shop-roof");
addSign(7, 3, -14, 4, "shop-sign");

addFloor(4, 8, 2, 6, "build-lot");
addFloor(10, 14, 2, 6, "build-lot");
addFloor(-3, 1, -11, -7, "build-lot");

export const policeTheme: ThemePack = {
  id: "police",
  displayName: "Police and Crimes",
  palette: {
    sky: "#87ceeb",
    policeBlue: "#2446c7",
    alarm: "#ffe85c",
    grass: "#6fc66b"
  },
  blocks: [
    { id: "blue", label: "Blue Block", color: "#2446c7" },
    { id: "station-floor", label: "Station Floor", color: "#dbeafe" },
    { id: "station-wall", label: "Station Wall", color: "#f8fafc" },
    { id: "station-roof", label: "Station Roof", color: "#2446c7" },
    { id: "police-blue", label: "Police Sign", color: "#1d4ed8" },
    { id: "door", label: "Door", color: "#8b5a2b" },
    { id: "jail-floor", label: "Jail Floor", color: "#cbd5e1" },
    { id: "jail-wall", label: "Jail Wall", color: "#64748b" },
    { id: "jail-roof", label: "Jail Roof", color: "#334155" },
    { id: "bars", label: "Bars", color: "#e2e8f0" },
    { id: "shop-floor", label: "Shop Floor", color: "#fef3c7" },
    { id: "shop-wall", label: "Shop Wall", color: "#f97316" },
    { id: "shop-roof", label: "Shop Roof", color: "#ef4444" },
    { id: "shop-sign", label: "Shop Sign", color: "#fde047" },
    { id: "build-lot", label: "Build Lot", color: "#a7f3d0" }
  ],
  tools: [
    { id: "builder", kind: "buildTool", label: "Build", icon: "B" },
    { id: "breaker", kind: "breakTool", label: "Break", icon: "X" },
    { id: "cuffs", kind: "handcuffs", label: "Cuffs", icon: "C" },
    { id: "taser", kind: "taser", label: "Taser", icon: "T" },
    { id: "blaster", kind: "weapon", label: "Blaster", icon: "P" },
    { id: "radio", kind: "radio", label: "Radio", icon: "R" }
  ],
  entities: [
    { id: "police-man", role: "friendly", label: "Police Man", color: "#2446c7" },
    { id: "police-woman", role: "friendly", label: "Police Woman", color: "#2563eb" },
    { id: "criminal", role: "criminal", label: "Criminal", color: "#111827" },
    { id: "civilian", role: "civilian", label: "Shop Worker", color: "#22c55e" }
  ],
  missions: [
    {
      id: "practice-call",
      label: "Practice shop call",
      alarmText: "Practice alarm at the shop.",
      isPractice: true,
      objectives: [
        { kind: "travel", text: "Practice alarm: go to the orange shop across the road." },
        { kind: "disarm", text: "Use the taser or blaster to tag the practice criminal." },
        { kind: "cuff", text: "Use handcuffs when you are close." },
        { kind: "transport", text: "Bring the cuffed criminal back to the jail." },
        { kind: "jail", text: "Stand in the jail drop zone to finish the practice call." }
      ]
    },
    {
      id: "actual-call",
      label: "Actual shop robbery",
      alarmText: "Actual alarm at the shop.",
      isPractice: false,
      objectives: [
        { kind: "travel", text: "Alarm: get to the shop. The criminal has a toy hazard prop." },
        { kind: "disarm", text: "Use taser or blaster to disarm from close range." },
        { kind: "cuff", text: "Use handcuffs while close to the criminal." },
        { kind: "transport", text: "Take the cuffed criminal to the station jail." },
        { kind: "jail", text: "Stand in the jail drop zone to complete the call." }
      ]
    }
  ],
  spawnScene: {
    playerSpawn: { x: -11, y: 3, z: -16, yaw: 0.1 },
    jailDrop: { x: -19, y: 2.9, z: 20 },
    shopCall: { x: 17, y: 1, z: -20 },
    policeCar: { x: -3, y: 0.75, z: -9, yaw: 0 },
    blocks,
    entities: [
      { id: "officer-1", entityId: "police-man", x: -15, y: 1, z: 9, yaw: 1.2 },
      { id: "officer-2", entityId: "police-woman", x: -7, y: 1, z: 15, yaw: -0.8 },
      { id: "shop-worker", entityId: "civilian", x: 18, y: 1, z: -19, yaw: Math.PI }
    ]
  }
};
