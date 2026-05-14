import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { EntityState, MissionDefinition, MissionLocation, ThemePack } from "./types";

export type MissionSignal =
  | "arrived-shop"
  | "criminal-disarmed"
  | "criminal-cuffed"
  | "arrived-jail";

interface ActiveMission {
  definition: MissionDefinition;
  location: MissionLocation;
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
    const location = this.theme.missionLocations.find((candidate) => candidate.id === definition.locationId);
    if (!location) {
      throw new Error(`Unknown mission location ${definition.locationId}`);
    }
    this.active = {
      definition,
      location,
      objectiveIndex: 0,
      cuffedCriminalId: null,
      complete: false
    };
    return definition;
  }

  update(playerPosition: Vector3, jailPosition: Vector3): MissionSignal[] {
    if (!this.active || this.active.complete) {
      return [];
    }
    const signals: MissionSignal[] = [];
    const callPoint = new Vector3(
      this.active.location.callPoint.x,
      this.active.location.callPoint.y,
      this.active.location.callPoint.z
    );
    if (Vector3.Distance(playerPosition, callPoint) < 8) {
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

  getActiveLocation(): MissionLocation | null {
    return this.active?.location ?? null;
  }

  getHudText(): { title: string; text: string; alarmActive: boolean; complete: boolean } {
    if (!this.active) {
      return {
        title: this.theme.displayName,
        text: "Build blocks, explore, or tap Practice/Actual to start a mission.",
        alarmActive: false,
        complete: false
      };
    }
    if (this.active.complete) {
      return {
        title: "Call complete",
        text: "Great job. This world is ready for another practice or actual mission.",
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

  getCurrentObjectiveText(): string | null {
    if (!this.active || this.active.complete) {
      return null;
    }
    return this.active.definition.objectives[this.active.objectiveIndex]?.text ?? null;
  }

  isActiveActual(): boolean {
    return this.active?.definition.isPractice === false;
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
