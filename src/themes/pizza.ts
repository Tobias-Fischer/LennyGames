import type { ThemePack } from "../game/types";
import { WorldBuilder } from "../game/WorldBuilder";

const world = new WorldBuilder();

world.building({
  x1: -12,
  x2: 4,
  z1: -8,
  z2: 8,
  height: 4,
  floor: "pizza-floor",
  wall: "pizza-wall",
  roof: "pizza-roof",
  protected: true,
  openings: [
    { side: "south", start: -7, end: -3, maxY: 3 },
    { side: "east", start: -1, end: 3, maxY: 3 }
  ]
});
world.stripe(-10, 2, -9, 3, "pizza-sign");
world.floor(-8, 0, -12, -9, "sidewalk", true);
world.floor(-10, -7, -2, 5, "counter", true);
world.block(-10, 2, 1, "oven", true);
world.block(-10, 2, 3, "oven", true);
world.block(-4, 1, 5, "table", true);
world.block(-2, 1, 5, "table", true);

world.building({
  x1: 18,
  x2: 30,
  z1: -20,
  z2: -8,
  height: 4,
  floor: "shop-floor",
  wall: "shop-wall",
  roof: "shop-roof",
  protected: true,
  openings: [{ side: "west", start: -16, end: -12, maxY: 3 }]
});
world.stripe(20, 28, -21, 3, "shop-sign");

world.building({
  x1: -42,
  x2: -30,
  z1: 20,
  z2: 32,
  height: 4,
  floor: "home-floor",
  wall: "home-wall",
  roof: "home-roof",
  protected: true,
  openings: [{ side: "east", start: 24, end: 28, maxY: 3 }]
});
world.floor(-44, -29, 18, 34, "sidewalk", true);

world.floor(12, 24, 12, 24, "park-grass", true);
world.block(18, 1, 18, "tree-trunk", true);
world.block(18, 2, 18, "tree-leaf", true);
world.block(17, 2, 18, "tree-leaf", true);
world.block(19, 2, 18, "tree-leaf", true);
world.block(18, 2, 17, "tree-leaf", true);
world.block(18, 2, 19, "tree-leaf", true);

for (let x = -62; x <= 62; x += 8) {
  world.floor(x, x + 2, -30, -29, "sidewalk", true);
  world.floor(x, x + 2, 29, 30, "sidewalk", true);
}
for (let z = -62; z <= 62; z += 8) {
  world.floor(-8, -7, z, z + 2, "sidewalk", true);
  world.floor(7, 8, z, z + 2, "sidewalk", true);
}
world.floor(8, 14, -8, 4, "delivery-pad", true);
world.floor(-24, -16, -18, -10, "build-lot");
world.floor(34, 44, 12, 22, "build-lot");

export const pizzaTheme: ThemePack = {
  id: "pizza",
  displayName: "Lenny's Pizza Dash",
  worldVersion: 1,
  palette: {
    grass: "#5fbf63",
    sky: "#8bd3ff"
  },
  blocks: [
    { id: "blue", label: "Build Block", color: "#ef4444" },
    { id: "pizza-floor", label: "Pizza Tile", color: "#fef3c7" },
    { id: "pizza-wall", label: "Pizza Wall", color: "#f8fafc" },
    { id: "pizza-roof", label: "Pizza Roof", color: "#dc2626" },
    { id: "pizza-sign", label: "Pizza Sign", color: "#2563eb" },
    { id: "counter", label: "Counter", color: "#d97706" },
    { id: "oven", label: "Oven", color: "#374151" },
    { id: "table", label: "Table", color: "#b45309" },
    { id: "shop-floor", label: "Shop Floor", color: "#e0f2fe" },
    { id: "shop-wall", label: "Shop Wall", color: "#60a5fa" },
    { id: "shop-roof", label: "Shop Roof", color: "#1d4ed8" },
    { id: "shop-sign", label: "Shop Sign", color: "#facc15" },
    { id: "home-floor", label: "Home Floor", color: "#fef9c3" },
    { id: "home-wall", label: "Home Wall", color: "#fca5a5" },
    { id: "home-roof", label: "Home Roof", color: "#7f1d1d" },
    { id: "sidewalk", label: "Sidewalk", color: "#e5e7eb" },
    { id: "delivery-pad", label: "Delivery Pad", color: "#93c5fd" },
    { id: "build-lot", label: "Build Lot", color: "#a7f3d0" },
    { id: "park-grass", label: "Park Grass", color: "#86efac" },
    { id: "tree-trunk", label: "Tree Trunk", color: "#8b5a2b" },
    { id: "tree-leaf", label: "Tree Leaf", color: "#22c55e" }
  ],
  tools: [
    { id: "builder", kind: "buildTool", label: "Build", icon: "B" },
    { id: "breaker", kind: "breakTool", label: "Break", icon: "X" },
    { id: "order-pad", kind: "taser", label: "Order", icon: "O" },
    { id: "oven-tool", kind: "weapon", label: "Oven", icon: "H" },
    { id: "pizza-box", kind: "weapon", label: "Pizza", icon: "P" },
    { id: "delivery-bag", kind: "handcuffs", label: "Deliver", icon: "D" },
    { id: "phone", kind: "radio", label: "Phone", icon: "F" }
  ],
  entities: [
    { id: "cook", role: "friendly", label: "Cook", color: "#ef4444" },
    { id: "driver", role: "friendly", label: "Driver", color: "#2563eb" },
    { id: "hungry-customer", role: "criminal", label: "Hungry Customer", color: "#7c3aed" },
    { id: "customer", role: "civilian", label: "Customer", color: "#f59e0b" }
  ],
  missions: [
    {
      id: "pizza-practice",
      label: "Practice order",
      alarmText: "Practice order at the counter.",
      isPractice: true,
      locationId: "counter-order",
      objectives: [
        { kind: "travel", text: "Practice: go to the pizza counter marker." },
        { kind: "disarm", text: "Use Order or Oven to prepare the practice pizza." },
        { kind: "cuff", text: "Use Deliver when close to the customer." },
        { kind: "transport", text: "Bring the customer to the blue delivery pad." },
        { kind: "jail", text: "Stand on the delivery pad to finish the order." }
      ]
    },
    {
      id: "pizza-rush",
      label: "Rush delivery",
      alarmText: "Rush pizza order across town.",
      isPractice: false,
      locationId: "home-delivery",
      objectives: [
        { kind: "travel", text: "Actual: ride or walk to the house marker." },
        { kind: "disarm", text: "Use Pizza or Order to help the hungry customer." },
        { kind: "cuff", text: "Use Deliver when close." },
        { kind: "transport", text: "Guide the customer back to the delivery pad." },
        { kind: "jail", text: "Stand on the delivery pad to complete the rush order." }
      ]
    }
  ],
  missionLocations: [
    {
      id: "counter-order",
      label: "Pizza Counter",
      callPoint: { x: -10, y: 2.9, z: -2 },
      criminalSpawn: { x: -2, y: 1, z: 8, yaw: Math.PI },
      markerColor: "#2563eb"
    },
    {
      id: "home-delivery",
      label: "Delivery House",
      callPoint: { x: -72, y: 2.9, z: 52 },
      criminalSpawn: { x: -70, y: 1, z: 58, yaw: -0.8 },
      markerColor: "#ef4444"
    }
  ],
  labels: [
    { id: "pizza-shop", text: "Pizza Shop", x: -8, y: 8.5, z: -18.4, yaw: 0, color: "#dc2626", backgroundColor: "#fef3c7" },
    { id: "pizza-side", text: "Pizza Shop", x: 24, y: 4.4, z: -26, yaw: 0, color: "#dc2626", backgroundColor: "#fef3c7", size: 0.68 },
    { id: "counter", text: "Pizza Counter", x: -19, y: 4.8, z: 2, yaw: Math.PI / 2, color: "#92400e", backgroundColor: "#ffedd5" },
    { id: "ovens", text: "Ovens", x: -21.2, y: 5.8, z: 4, yaw: Math.PI / 2, color: "#f8fafc", backgroundColor: "#374151" },
    { id: "bikes", text: "Delivery Bikes", x: 44, y: 4.2, z: -24, yaw: -0.2, color: "#2563eb", backgroundColor: "#fee2e2" },
    { id: "delivery-pad", text: "Delivery Pad", x: 22, y: 4.4, z: 8, yaw: Math.PI, color: "#1d4ed8", backgroundColor: "#dbeafe" },
    { id: "delivery-house", text: "Delivery House", x: -72, y: 7.6, z: 44, yaw: Math.PI / 2, color: "#7f1d1d", backgroundColor: "#fef9c3" }
  ],
  decor: {
    kind: "pizza",
    blockColor: "#f8fafc",
    accentColor: "#ef4444",
    roofColor: "#2563eb"
  },
  practiceArea: {
    id: "counter-order",
    label: "Pizza Counter",
    callPoint: { x: -10, y: 2.9, z: -2 },
    criminalSpawn: { x: -2, y: 1, z: 8, yaw: Math.PI },
    markerColor: "#2563eb"
  },
  spawnScene: {
    playerSpawn: { x: 12, y: 3, z: -36, yaw: -0.1 },
    jailDrop: { x: 22, y: 2.9, z: -4 },
    vehicles: [
      { id: "pizza-bike-1", label: "Pizza Bike", kind: "bike", x: 20, y: 0.55, z: -12, yaw: 0, color: "#2563eb", accentColor: "#ef4444", speed: 15 },
      { id: "pizza-bike-2", label: "Delivery Bike", kind: "bike", x: 24, y: 0.55, z: -12, yaw: 0, color: "#ef4444", accentColor: "#2563eb", speed: 15 },
      { id: "delivery-car", label: "Delivery Car", kind: "car", x: 30, y: 0.75, z: -14, yaw: 0, color: "#ef4444", accentColor: "#f8fafc", speed: 13 }
    ],
    blocks: world.blocks,
    entities: [
      { id: "cook-1", entityId: "cook", x: -18, y: 1, z: 3, yaw: 1.2 },
      { id: "cook-2", entityId: "cook", x: -18, y: 1, z: 7, yaw: 1.2 },
      { id: "driver-1", entityId: "driver", x: 22, y: 1, z: -16, yaw: 0.4 },
      { id: "customer-1", entityId: "customer", x: -2, y: 1, z: -16, yaw: Math.PI },
      { id: "customer-2", entityId: "customer", x: 34, y: 1, z: -30, yaw: -1.2 },
      { id: "customer-3", entityId: "customer", x: -62, y: 1, z: 50, yaw: 1.4 }
    ]
  }
};
