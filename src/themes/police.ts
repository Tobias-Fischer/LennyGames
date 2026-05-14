import type { ThemePack } from "../game/types";
import { WorldBuilder } from "../game/WorldBuilder";

const world = new WorldBuilder();

world.building({
  x1: -14,
  x2: -4,
  z1: -6,
  z2: 4,
  height: 4,
  floor: "station-floor",
  wall: "station-wall",
  roof: "station-roof",
  protected: true,
  openings: [
    { side: "south", start: -10, end: -8, maxY: 3 },
    { side: "east", start: -1, end: 1, maxY: 3 }
  ]
});
world.posts(-14, -4, -6, 4, 1, 4, "police-blue");
world.stripe(-11, -7, -7, 3, "police-blue");
world.stripe(-11, -7, -7, 4, "police-blue");
world.floor(-11, -7, -10, -7, "sidewalk", true);
world.floor(-13, -5, -4, 2, "station-floor", true);

world.building({
  x1: -19,
  x2: -13,
  z1: 5,
  z2: 13,
  height: 4,
  floor: "jail-floor",
  wall: "jail-wall",
  roof: "jail-roof",
  protected: true,
  openings: [{ side: "south", start: -17, end: -15, maxY: 3 }]
});
for (let x = -18; x <= -14; x += 2) {
  for (let y = 1; y <= 3; y += 1) {
    world.block(x, y, 6, "bars", true);
  }
}
world.floor(-18, -14, 8, 11, "jail-zone", true);

world.building({
  x1: 8,
  x2: 16,
  z1: -19,
  z2: -11,
  height: 4,
  floor: "shop-floor",
  wall: "shop-wall",
  roof: "shop-roof",
  protected: true,
  openings: [{ side: "west", start: -16, end: -14, maxY: 3 }]
});
world.stripe(10, 14, -20, 3, "shop-sign");
world.floor(5, 7, -17, -13, "sidewalk", true);

world.building({
  x1: 15,
  x2: 24,
  z1: 12,
  z2: 20,
  height: 4,
  floor: "donut-floor",
  wall: "donut-wall",
  roof: "donut-roof",
  protected: true,
  openings: [{ side: "west", start: 15, end: 17, maxY: 3 }]
});
world.stripe(17, 22, 11, 3, "donut-sign");
world.floor(12, 14, 14, 18, "sidewalk", true);

world.floor(-24, -16, -24, -16, "park-grass", true);
world.floor(-23, -17, -23, -17, "training-pad", true);
world.block(-20, 1, -20, "target-red", true);
world.block(-20, 2, -20, "target-white", true);
world.block(-20, 3, -20, "target-red", true);
world.block(-23, 1, -17, "tree-trunk", true);
world.block(-23, 2, -17, "tree-leaf", true);
world.block(-22, 2, -17, "tree-leaf", true);
world.block(-23, 2, -18, "tree-leaf", true);
world.block(-24, 2, -17, "tree-leaf", true);

world.floor(2, 7, 9, 14, "build-lot");
world.floor(3, 9, 18, 24, "build-lot");
world.floor(-5, 2, 12, 20, "build-lot");
world.floor(20, 27, -7, -1, "build-lot");

for (let offset = -62; offset <= 62; offset += 8) {
  world.floor(-8, -7, offset, offset + 2, "sidewalk", true);
  world.floor(7, 8, offset, offset + 2, "sidewalk", true);
  world.floor(offset, offset + 2, -30, -29, "sidewalk", true);
  world.floor(offset, offset + 2, 29, 30, "sidewalk", true);
}

[
  { x1: 34, x2: 42, z1: -18, z2: -10, wall: "shop-wall", roof: "shop-roof", sign: "shop-sign" },
  { x1: -48, x2: -40, z1: 26, z2: 34, wall: "station-wall", roof: "station-roof", sign: "police-blue" },
  { x1: 42, x2: 51, z1: 18, z2: 27, wall: "donut-wall", roof: "donut-roof", sign: "donut-sign" },
  { x1: -50, x2: -42, z1: -52, z2: -44, wall: "shop-wall", roof: "shop-roof", sign: "shop-sign" }
].forEach((lot) => {
  world.building({
    ...lot,
    height: 4,
    floor: "shop-floor",
    protected: true,
    openings: [{ side: "south", start: lot.x1 + 2, end: lot.x1 + 4, maxY: 3 }]
  });
  world.stripe(lot.x1 + 2, lot.x2 - 2, lot.z1 - 1, 3, lot.sign);
});

export const policeTheme: ThemePack = {
  id: "police",
  displayName: "Police and Crimes",
  worldVersion: 3,
  palette: {
    sky: "#87ceeb",
    policeBlue: "#2446c7",
    alarm: "#ffe85c",
    grass: "#6fc66b"
  },
  blocks: [
    { id: "blue", label: "Blue Block", color: "#2446c7" },
    { id: "station-floor", label: "Station Floor", color: "#dbeafe" },
    { id: "station-wall", label: "Station Wall", color: "#eff6ff" },
    { id: "station-roof", label: "Station Roof", color: "#1e3a8a" },
    { id: "police-blue", label: "Police Sign", color: "#2563eb" },
    { id: "jail-floor", label: "Jail Floor", color: "#cbd5e1" },
    { id: "jail-wall", label: "Jail Wall", color: "#64748b" },
    { id: "jail-roof", label: "Jail Roof", color: "#334155" },
    { id: "jail-zone", label: "Jail Zone", color: "#facc15" },
    { id: "bars", label: "Bars", color: "#e2e8f0" },
    { id: "shop-floor", label: "Shop Floor", color: "#fef3c7" },
    { id: "shop-wall", label: "Shop Wall", color: "#fb923c" },
    { id: "shop-roof", label: "Shop Roof", color: "#ef4444" },
    { id: "shop-sign", label: "Shop Sign", color: "#fde047" },
    { id: "donut-floor", label: "Donut Floor", color: "#fae8ff" },
    { id: "donut-wall", label: "Donut Wall", color: "#f0abfc" },
    { id: "donut-roof", label: "Donut Roof", color: "#a21caf" },
    { id: "donut-sign", label: "Donut Sign", color: "#f9a8d4" },
    { id: "build-lot", label: "Build Lot", color: "#a7f3d0" },
    { id: "sidewalk", label: "Sidewalk", color: "#e5e7eb" },
    { id: "park-grass", label: "Park Grass", color: "#86efac" },
    { id: "training-pad", label: "Training Pad", color: "#93c5fd" },
    { id: "target-red", label: "Target Red", color: "#ef4444" },
    { id: "target-white", label: "Target White", color: "#f8fafc" },
    { id: "tree-trunk", label: "Tree Trunk", color: "#8b5a2b" },
    { id: "tree-leaf", label: "Tree Leaf", color: "#22c55e" }
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
    { id: "civilian", role: "civilian", label: "Civilian", color: "#22c55e" }
  ],
  missions: [
    {
      id: "practice-call",
      label: "Practice training call",
      alarmText: "Practice alarm at the training park.",
      isPractice: true,
      locationId: "training-park",
      objectives: [
        { kind: "travel", text: "Practice call: go to the blue training pad in the park." },
        { kind: "disarm", text: "Use the taser or blaster to tag the practice criminal." },
        { kind: "cuff", text: "Go close and use cuffs." },
        { kind: "transport", text: "Bring the cuffed criminal to the yellow jail zone." },
        { kind: "jail", text: "Stand in the yellow jail zone to finish the practice call." }
      ]
    },
    {
      id: "actual-call",
      label: "Actual shop robbery",
      alarmText: "Actual alarm at the shop.",
      isPractice: false,
      locationId: "corner-shop",
      objectives: [
        { kind: "travel", text: "Alarm: go to the orange shop. Look for the criminal." },
        { kind: "disarm", text: "Use taser or blaster from close range." },
        { kind: "cuff", text: "Use cuffs when the criminal is stunned or disarmed." },
        { kind: "transport", text: "Take the cuffed criminal to the yellow jail zone." },
        { kind: "jail", text: "Stand in the yellow jail zone to complete the call." }
      ]
    },
    {
      id: "donut-call",
      label: "Donut shop trouble",
      alarmText: "Alarm at the donut shop.",
      isPractice: false,
      locationId: "donut-shop",
      objectives: [
        { kind: "travel", text: "Alarm: go to the purple donut shop." },
        { kind: "disarm", text: "Use taser or blaster to stop the runaway criminal." },
        { kind: "cuff", text: "Use cuffs when you are close enough." },
        { kind: "transport", text: "Bring the cuffed criminal back to jail." },
        { kind: "jail", text: "Stand in the yellow jail zone to finish." }
      ]
    }
  ],
  missionLocations: [
    {
      id: "corner-shop",
      label: "Corner Shop",
      callPoint: { x: 16, y: 2.9, z: -28 },
      criminalSpawn: { x: 24, y: 1, z: -30, yaw: Math.PI },
      markerColor: "#f97316"
    },
    {
      id: "donut-shop",
      label: "Donut Shop",
      callPoint: { x: 30, y: 2.9, z: 30 },
      criminalSpawn: { x: 40, y: 1, z: 34, yaw: -1.4 },
      markerColor: "#d946ef"
    },
    {
      id: "training-park",
      label: "Training Park",
      callPoint: { x: -40, y: 2.9, z: -40 },
      criminalSpawn: { x: -38, y: 1, z: -37, yaw: 0.7 },
      markerColor: "#3b82f6"
    }
  ],
  practiceArea: {
    id: "training-park",
    label: "Training Park",
    callPoint: { x: -40, y: 2.9, z: -40 },
    criminalSpawn: { x: -38, y: 1, z: -37, yaw: 0.7 },
    markerColor: "#3b82f6"
  },
  spawnScene: {
    playerSpawn: { x: -18, y: 3, z: -34, yaw: 0 },
    jailDrop: { x: -32, y: 2.9, z: 18 },
    vehicles: [
      {
        id: "police-car",
        label: "Police Car",
        kind: "car",
        x: 6,
        y: 0.75,
        z: -34,
        yaw: 0,
        color: "#2446c7",
        accentColor: "#f8fafc",
        speed: 13,
        turnSpeed: 2.1
      }
    ],
    blocks: world.blocks,
    entities: [
      { id: "officer-1", entityId: "police-man", x: -24, y: 1, z: -8, yaw: 0.8 },
      { id: "officer-2", entityId: "police-woman", x: -10, y: 1, z: 2, yaw: -0.5 },
      { id: "officer-3", entityId: "police-man", x: -29, y: 1, z: 17, yaw: 1.2 },
      { id: "civilian-1", entityId: "civilian", x: 19, y: 1, z: -28, yaw: Math.PI },
      { id: "civilian-2", entityId: "civilian", x: 35, y: 1, z: 29, yaw: -1.1 },
      { id: "civilian-3", entityId: "civilian", x: -30, y: 1, z: -34, yaw: 0.2 },
      { id: "civilian-4", entityId: "civilian", x: 7, y: 1, z: 28, yaw: 2.1 }
    ]
  }
};
