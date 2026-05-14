import type { ThemePack } from "../game/types";
import { WorldBuilder } from "../game/WorldBuilder";

const world = new WorldBuilder();

world.building({
  x1: -22,
  x2: -8,
  z1: -10,
  z2: 4,
  height: 4,
  floor: "barracks-floor",
  wall: "barracks-wall",
  roof: "camo-roof",
  protected: true,
  openings: [{ side: "south", start: -17, end: -13, maxY: 3 }]
});
world.stripe(-20, -10, -11, 3, "camo-dark");
world.building({
  x1: 12,
  x2: 28,
  z1: -18,
  z2: -4,
  height: 5,
  floor: "hangar-floor",
  wall: "hangar-wall",
  roof: "metal-roof",
  protected: true,
  openings: [{ side: "south", start: 17, end: 23, maxY: 4 }]
});
world.building({
  x1: -45,
  x2: -31,
  z1: 16,
  z2: 30,
  height: 4,
  floor: "command-floor",
  wall: "command-wall",
  roof: "camo-roof",
  protected: true,
  openings: [{ side: "east", start: 20, end: 24, maxY: 3 }]
});
world.floor(-6, 8, 8, 22, "parade-ground", true);
world.floor(30, 64, -10, -2, "runway", true);
world.floor(32, 64, 0, 2, "runway-line", true);
world.floor(-60, -40, -44, -28, "training-sand", true);
world.floor(-57, -43, -41, -31, "training-pad", true);
for (let z = -40; z <= -32; z += 4) {
  world.block(-50, 1, z, "target-red", true);
  world.block(-50, 2, z, "target-white", true);
}
world.floor(34, 48, 18, 34, "vehicle-yard", true);
world.posts(34, 48, 18, 34, 1, 2, "barrier");
for (let x = -62; x <= 62; x += 8) {
  world.floor(x, x + 2, -30, -29, "concrete", true);
  world.floor(x, x + 2, 29, 30, "concrete", true);
}
for (let z = -62; z <= 62; z += 8) {
  world.floor(-8, -7, z, z + 2, "concrete", true);
  world.floor(7, 8, z, z + 2, "concrete", true);
}

export const armyTheme: ThemePack = {
  id: "army",
  displayName: "Army Barracks",
  worldVersion: 1,
  palette: {
    grass: "#6f8754",
    sky: "#9bc8ef"
  },
  blocks: [
    { id: "blue", label: "Build Block", color: "#5b7553" },
    { id: "barracks-floor", label: "Barracks Floor", color: "#b7b08a" },
    { id: "barracks-wall", label: "Barracks Wall", color: "#7f8f55" },
    { id: "camo-roof", label: "Camo Roof", color: "#40512f" },
    { id: "camo-dark", label: "Camo Sign", color: "#26381f" },
    { id: "hangar-floor", label: "Hangar Floor", color: "#9ca3af" },
    { id: "hangar-wall", label: "Hangar Wall", color: "#6b7280" },
    { id: "metal-roof", label: "Metal Roof", color: "#374151" },
    { id: "command-floor", label: "Command Floor", color: "#d6d3aa" },
    { id: "command-wall", label: "Command Wall", color: "#4d6b3b" },
    { id: "parade-ground", label: "Parade Ground", color: "#c8b98b" },
    { id: "runway", label: "Runway", color: "#4b5563" },
    { id: "runway-line", label: "Runway Line", color: "#f8fafc" },
    { id: "training-sand", label: "Training Sand", color: "#d6b36a" },
    { id: "training-pad", label: "Training Pad", color: "#9ca3af" },
    { id: "target-red", label: "Target Red", color: "#dc2626" },
    { id: "target-white", label: "Target White", color: "#f8fafc" },
    { id: "vehicle-yard", label: "Vehicle Yard", color: "#737373" },
    { id: "barrier", label: "Barrier", color: "#facc15" },
    { id: "concrete", label: "Concrete Path", color: "#d1d5db" }
  ],
  tools: [
    { id: "builder", kind: "buildTool", label: "Build", icon: "B" },
    { id: "breaker", kind: "breakTool", label: "Break", icon: "X" },
    { id: "rifle", kind: "taser", label: "Rifle", icon: "R" },
    { id: "minigun", kind: "weapon", label: "Mini", icon: "M" },
    { id: "launcher", kind: "weapon", label: "Launch", icon: "L" },
    { id: "radio", kind: "radio", label: "Radio", icon: "A" },
    { id: "escort", kind: "handcuffs", label: "Escort", icon: "E" }
  ],
  entities: [
    { id: "soldier", role: "friendly", label: "Soldier", color: "#4d6b3b" },
    { id: "commander", role: "friendly", label: "Commander", color: "#26381f" },
    { id: "enemy-agent", role: "criminal", label: "Enemy Agent", color: "#7f1d1d" },
    { id: "mechanic", role: "civilian", label: "Mechanic", color: "#f59e0b" }
  ],
  missions: [
    {
      id: "army-practice",
      label: "Training range practice",
      alarmText: "Training mission at the target range.",
      isPractice: true,
      locationId: "training-range",
      objectives: [
        { kind: "travel", text: "Practice: go to the training range." },
        { kind: "disarm", text: "Use Rifle, Mini, or Launcher on the practice agent." },
        { kind: "cuff", text: "Go close and use Escort." },
        { kind: "transport", text: "Bring the agent to the command finish zone." },
        { kind: "jail", text: "Stand in the command finish zone to complete training." }
      ]
    },
    {
      id: "army-actual",
      label: "Defend the base",
      alarmText: "Base alert. Enemy agent near the hangar.",
      isPractice: false,
      locationId: "hangar-alert",
      objectives: [
        { kind: "travel", text: "Actual: go to the hangar marker." },
        { kind: "disarm", text: "Use a toy action tool to stop the agent." },
        { kind: "cuff", text: "Use Escort when close." },
        { kind: "transport", text: "Escort the agent back to command." },
        { kind: "jail", text: "Stand in the command finish zone to finish." }
      ]
    }
  ],
  missionLocations: [
    {
      id: "training-range",
      label: "Training Range",
      callPoint: { x: -100, y: 2.9, z: -72 },
      criminalSpawn: { x: -98, y: 1, z: -68, yaw: 0.5 },
      markerColor: "#facc15"
    },
    {
      id: "hangar-alert",
      label: "Hangar Alert",
      callPoint: { x: 42, y: 2.9, z: -28 },
      criminalSpawn: { x: 48, y: 1, z: -24, yaw: Math.PI },
      markerColor: "#ef4444"
    }
  ],
  labels: [
    { id: "barracks", text: "Barracks", x: -30, y: 8.2, z: -20.4, yaw: 0, color: "#26381f", backgroundColor: "#d6d3aa" },
    { id: "barracks-side", text: "Barracks", x: -4, y: 4.5, z: -28, yaw: 0, color: "#26381f", backgroundColor: "#d6d3aa" },
    { id: "hangar", text: "Hangar", x: 40, y: 9.2, z: -36.4, yaw: 0, color: "#374151", backgroundColor: "#e5e7eb" },
    { id: "command", text: "Command", x: -62, y: 7.6, z: 46, yaw: Math.PI / 2, color: "#26381f", backgroundColor: "#d6d3aa" },
    { id: "training", text: "Training Range", x: -100, y: 5.2, z: -86, yaw: 0, color: "#92400e", backgroundColor: "#fef3c7" },
    { id: "runway", text: "Runway", x: 96, y: 3.8, z: -20, yaw: 0, color: "#f8fafc", backgroundColor: "#4b5563" },
    { id: "vehicle-yard", text: "Vehicle Yard", x: 82, y: 4.8, z: 38, yaw: -0.4, color: "#facc15", backgroundColor: "#334155" }
  ],
  decor: {
    kind: "base",
    blockColor: "#7f8f55",
    accentColor: "#facc15",
    roofColor: "#40512f"
  },
  practiceArea: {
    id: "training-range",
    label: "Training Range",
    callPoint: { x: -100, y: 2.9, z: -72 },
    criminalSpawn: { x: -98, y: 1, z: -68, yaw: 0.5 },
    markerColor: "#facc15"
  },
  spawnScene: {
    playerSpawn: { x: 0, y: 3, z: -44, yaw: 0.2 },
    jailDrop: { x: -75, y: 2.9, z: 46 },
    vehicles: [
      { id: "tank", label: "Tank", kind: "tank", x: 78, y: 0.85, z: 44, yaw: -0.6, color: "#4d6b3b", accentColor: "#26381f", speed: 8 },
      { id: "plane", label: "Plane", kind: "plane", x: 92, y: 0.85, z: -8, yaw: 1.55, color: "#94a3b8", accentColor: "#e2e8f0", speed: 18 },
      { id: "bomber", label: "Bomber Plane", kind: "plane", x: 108, y: 0.85, z: 8, yaw: 1.55, color: "#64748b", accentColor: "#334155", speed: 16 },
      { id: "truck", label: "Army Truck", kind: "truck", x: 62, y: 0.75, z: 50, yaw: 0, color: "#5b7553", accentColor: "#111827", speed: 11 }
    ],
    blocks: world.blocks,
    entities: [
      { id: "soldier-1", entityId: "soldier", x: -30, y: 1, z: -12, yaw: 0.8 },
      { id: "soldier-2", entityId: "soldier", x: -8, y: 1, z: 12, yaw: -0.5 },
      { id: "commander-1", entityId: "commander", x: -72, y: 1, z: 44, yaw: 1.2 },
      { id: "mechanic-1", entityId: "mechanic", x: 70, y: 1, z: 34, yaw: 2.2 },
      { id: "mechanic-2", entityId: "mechanic", x: 32, y: 1, z: -14, yaw: -0.9 }
    ]
  }
};
