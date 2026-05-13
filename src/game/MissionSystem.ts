import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { EntityState, MissionDefinition, ThemePack } from "./types";

export type MissionSignal =
  | "arrived-shop"
  | "criminal-disarmed"
  | "criminal-cuffed"
  | "arrived-jail";

interface ActiveMission {
  definition: MissionDefinition;
  objectiveIndex: number;
  cuffedCriminalId: string | null;
  complete: boolean;
}

export class MissionSystem {
  private active: ActiveMission | null = null;

  constructor(private readonly theme: ThemePack) {}

  start(id: MissionDefinition["id"]): MissionDefinition {
    const definition = this.theme.missions.find((mission) => mission.id === id);
    if (!definition) {
      throw new Error(`Unknown mission ${id}`);
    }
    this.active = {
      definition,
      objectiveIndex: 0,
      cuffedCriminalId: null,
      complete: false
    };
    return definition;
  }

  update(playerPosition: Vector3, jailPosition: Vector3, shopPosition: Vector3): MissionSignal[] {
    if (!this.active || this.active.complete) {
      return [];
    }
    const signals: MissionSignal[] = [];
    if (Vector3.Distance(playerPosition, shopPosition) < 7) {
      signals.push("arrived-shop");
    }
    if (this.active.cuffedCriminalId && Vector3.Distance(playerPosition, jailPosition) < 6) {
      signals.push("arrived-jail");
    }
    signals.forEach((signal) => this.advance(signal));
    return signals;
  }

  markDisarmed(): void {
    this.advance("criminal-disarmed");
  }

  markCuffed(criminal: EntityState): void {
    if (!this.active) {
      return;
    }
    this.active.cuffedCriminalId = criminal.id;
    this.advance("criminal-cuffed");
  }

  getCuffedCriminalId(): string | null {
    return this.active?.cuffedCriminalId ?? null;
  }

  getHudText(): { title: string; text: string; alarmActive: boolean; complete: boolean } {
    if (!this.active) {
      return {
        title: "Police and Crimes",
        text: "Build blocks, practice with tools, or tap Practice/Actual to answer an alarm.",
        alarmActive: false,
        complete: false
      };
    }
    if (this.active.complete) {
      return {
        title: "Call complete",
        text: "Great job. The station is ready for another practice or actual call.",
        alarmActive: false,
        complete: true
      };
    }
    return {
      title: this.active.definition.label,
      text: this.active.definition.objectives[this.active.objectiveIndex]?.text ?? "Return to station.",
      alarmActive: true,
      complete: false
    };
  }

  isActiveActual(): boolean {
    return this.active?.definition.id === "actual-call";
  }

  isMissionActive(): boolean {
    return Boolean(this.active && !this.active.complete);
  }

  private advance(signal: MissionSignal): void {
    if (!this.active || this.active.complete) {
      return;
    }
    const current = this.active.definition.objectives[this.active.objectiveIndex];
    if (!current) {
      this.active.complete = true;
      return;
    }
    const matches =
      (current.kind === "travel" && signal === "arrived-shop") ||
      (current.kind === "locate" && signal === "arrived-shop") ||
      (current.kind === "disarm" && signal === "criminal-disarmed") ||
      (current.kind === "cuff" && signal === "criminal-cuffed") ||
      (current.kind === "transport" && signal === "arrived-jail") ||
      (current.kind === "jail" && signal === "arrived-jail");
    if (!matches) {
      return;
    }
    this.active.objectiveIndex += 1;
    if (this.active.objectiveIndex >= this.active.definition.objectives.length) {
      this.active.complete = true;
    }
  }
}
