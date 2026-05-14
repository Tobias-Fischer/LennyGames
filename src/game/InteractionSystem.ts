import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { EntityState, ToolDefinition } from "./types";

export interface InteractionTarget {
  criminal: EntityState | null;
  distance: number;
}

export class InteractionSystem {
  describe(tool: ToolDefinition, target: InteractionTarget | null, driving: boolean): string {
    if (driving) {
      return "Driving: steer with the stick. Tap Exit to hop out.";
    }
    if (tool.kind === "radio") {
      return `Use ${tool.label} to start an actual mission.`;
    }
    if (tool.kind === "buildTool") {
      return "Aim at a block, then Use to build.";
    }
    if (tool.kind === "breakTool") {
      return "Aim at your own block, then Use to break.";
    }
    if (!target?.criminal) {
      if (tool.kind === "handcuffs") {
        return `Find the mission target, then go close for ${tool.label}.`;
      }
      return "Start a practice or actual mission.";
    }
    const distance = Math.round(target.distance);
    if (tool.kind === "taser") {
      return target.distance <= 12 ? `${tool.label} ready (${distance}m). Tap Use.` : `${tool.label} too far. Go closer.`;
    }
    if (tool.kind === "weapon") {
      return target.distance <= 14 ? `${tool.label} ready (${distance}m). Tap Use.` : `${tool.label} too far. Go closer.`;
    }
    if (tool.kind === "handcuffs") {
      if (target.distance > 6) {
        return `${tool.label} too far. Walk closer.`;
      }
      if (!target.criminal.caught && !target.criminal.disarmed) {
        return "Use the action tool first, then finish the mission.";
      }
      return `Use ${tool.label} now.`;
    }
    return "Tap Use.";
  }

  distance(a: Vector3, b: Vector3): number {
    return Vector3.Distance(a, b);
  }
}
