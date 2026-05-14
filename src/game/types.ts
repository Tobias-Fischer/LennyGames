import type { Color3 } from "@babylonjs/core/Maths/math.color.js";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

export type ToolKind = "buildTool" | "breakTool" | "handcuffs" | "taser" | "weapon" | "radio";

export interface BlockDefinition {
  id: string;
  label: string;
  color: string;
}

export interface ToolDefinition {
  id: string;
  kind: ToolKind;
  label: string;
  icon: string;
}

export interface EntityDefinition {
  id: string;
  role: "friendly" | "criminal" | "civilian";
  label: string;
  color: string;
}

export type ObjectiveKind = "travel" | "locate" | "disarm" | "cuff" | "transport" | "jail";

export interface MissionObjective {
  kind: ObjectiveKind;
  text: string;
}

export interface MissionDefinition {
  id: string;
  label: string;
  alarmText: string;
  isPractice: boolean;
  locationId: string;
  objectives: MissionObjective[];
}

export interface MissionLocation {
  id: string;
  label: string;
  callPoint: { x: number; y: number; z: number };
  criminalSpawn: { x: number; y: number; z: number; yaw?: number };
  markerColor: string;
}

export interface SpawnBlock {
  x: number;
  y: number;
  z: number;
  typeId: string;
  protected?: boolean;
}

export interface SpawnEntity {
  id: string;
  entityId: string;
  x: number;
  y: number;
  z: number;
  yaw?: number;
}

export interface VehicleDefinition {
  id: string;
  label: string;
  kind: "car" | "bike" | "tank" | "plane" | "truck";
  x: number;
  y: number;
  z: number;
  yaw: number;
  color: string;
  accentColor?: string;
  speed?: number;
  turnSpeed?: number;
}

export interface SpawnScene {
  playerSpawn: { x: number; y: number; z: number; yaw: number };
  jailDrop: { x: number; y: number; z: number };
  vehicles: VehicleDefinition[];
  blocks: SpawnBlock[];
  entities: SpawnEntity[];
}

export interface ThemePack {
  id: string;
  displayName: string;
  worldVersion: number;
  palette: Record<string, string>;
  blocks: BlockDefinition[];
  tools: ToolDefinition[];
  entities: EntityDefinition[];
  missions: MissionDefinition[];
  missionLocations: MissionLocation[];
  practiceArea?: MissionLocation;
  spawnScene: SpawnScene;
}

export interface PickedBlock {
  key: string;
  x: number;
  y: number;
  z: number;
  normal: Vector3;
}

export interface HudState {
  health: number;
  selectedToolId: string;
  alarmActive: boolean;
  missionTitle: string;
  missionText: string;
  interactionText: string;
  driving: boolean;
  muted: boolean;
}

export interface EntityState {
  id: string;
  role: "friendly" | "criminal" | "civilian";
  label: string;
  meshName: string;
  caught: boolean;
  cuffed: boolean;
  disarmed: boolean;
  hasHazard: boolean;
}

export type ColorFactory = (hex: string) => Color3;
