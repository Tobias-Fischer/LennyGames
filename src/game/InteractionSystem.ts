import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { EntityState, ToolDefinition } from "./types";

export interface InteractionTarget {
  criminal: EntityState | null;
  distance: number;
}

export class InteractionSystem {
  describe(tool: ToolDefinition, target: InteractionTarget | null, driving: boolean): string {
    if (driving) {
      return "Driving: steer with the stick. Tap Car to exit.";
    }
    if (tool.kind === "radio") {
      return "Use radio to start an actual call.";
    }
    if (tool.kind === "buildTool") {
      return "Aim at a block, then Use to build.";
    }
    if (tool.kind === "breakTool") {
      return "Aim at your own block, then Use to break.";
    }
    if (!target?.criminal) {
      if (tool.kind === "handcuffs") {
        return "Find a stunned criminal, then go close for cuffs.";
      }
      return "Find a criminal or start a practice call.";
    }
    const distance = Math.round(target.distance);
    if (tool.kind === "taser") {
      return target.distance <= 12 ? `Taser ready (${distance}m). Tap Use.` : "Taser too far. Go closer.";
    }
    if (tool.kind === "weapon") {
      return target.distance <= 14 ? `Blaster ready (${distance}m). Tap Use.` : "Blaster too far. Go closer.";
    }
    if (tool.kind === "handcuffs") {
      if (target.distance > 6) {
        return "Cuffs too far. Walk closer.";
      }
      if (!target.criminal.caught && !target.criminal.disarmed) {
        return "Stun or disarm first, then use cuffs.";
      }
      return "Use cuffs now.";
    }
    return "Tap Use.";
  }

  distance(a: Vector3, b: Vector3): number {
    return Vector3.Distance(a, b);
  }
}
