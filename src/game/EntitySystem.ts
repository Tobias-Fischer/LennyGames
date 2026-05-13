import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";
import type { EntityDefinition, EntityState, SpawnEntity, ThemePack } from "./types";

interface EntityRecord extends EntityState {
  root: TransformNode;
  hazard?: Mesh;
  baseSpeed: number;
  home: Vector3;
  wanderSeed: number;
  wanderRadius: number;
}

export interface EntityTarget {
  criminal: EntityState;
  position: Vector3;
  distance: number;
}

export class EntitySystem {
  private readonly definitions = new Map<string, EntityDefinition>();
  private readonly records = new Map<string, EntityRecord>();
  private readonly materials = new Map<string, StandardMaterial>();

  constructor(
    private readonly scene: Scene,
    theme: ThemePack
  ) {
    theme.entities.forEach((entity) => this.definitions.set(entity.id, entity));
    theme.spawnScene.entities.forEach((entity) => this.spawn(entity));
  }

  spawnCriminalAt(position: Vector3, actual: boolean, id = actual ? "actual-criminal" : "practice-criminal", yaw = Math.PI): EntityState | null {
    this.remove(id);
    return this.spawn({
      id,
      entityId: "criminal",
      x: position.x,
      y: position.y,
      z: position.z,
      yaw
    }, actual);
  }

  update(dt: number, playerPosition: Vector3): void {
    this.records.forEach((record) => {
      if (record.role !== "criminal") {
        const t = performance.now() / 1000 + record.wanderSeed;
        const target = record.home.add(
          new Vector3(Math.sin(t * 0.35) * record.wanderRadius, 0, Math.cos(t * 0.29) * record.wanderRadius)
        );
        const delta = target.subtract(record.root.position);
        delta.y = 0;
        if (delta.length() > 0.2) {
          delta.normalize();
          record.root.position.addInPlace(delta.scale(dt * 0.75));
          record.root.rotation.y = Math.atan2(delta.x, delta.z);
        }
        return;
      }
      if (record.cuffed) {
        return;
      }
      const away = record.root.position.subtract(playerPosition);
      away.y = 0;
      if (away.length() < 14 && away.length() > 0.1) {
        away.normalize();
        record.root.position.addInPlace(away.scale(record.baseSpeed * dt));
        record.root.rotation.y = Math.atan2(away.x, away.z);
      }
    });
  }

  nearestCriminal(position: Vector3, maxDistance: number): EntityRecord | null {
    let nearest: EntityRecord | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    this.records.forEach((record) => {
      if (record.role !== "criminal") {
        return;
      }
      const distance = Vector3.Distance(record.root.position, position);
      if (distance <= maxDistance && distance < nearestDistance) {
        nearest = record;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  nearestCriminalTarget(position: Vector3, maxDistance: number): EntityTarget | null {
    const criminal = this.nearestCriminal(position, maxDistance);
    if (!criminal) {
      return null;
    }
    return {
      criminal,
      position: criminal.root.position.clone(),
      distance: Vector3.Distance(criminal.root.position, position)
    };
  }

  stunNearest(position: Vector3): boolean {
    const criminal = this.nearestCriminal(position, 9);
    if (!criminal || criminal.cuffed) {
      return false;
    }
    criminal.caught = true;
    criminal.baseSpeed = 0.8;
    return true;
  }

  disarmNearest(position: Vector3): boolean {
    const criminal = this.nearestCriminal(position, 6);
    if (!criminal || criminal.cuffed) {
      return false;
    }
    criminal.disarmed = true;
    criminal.hasHazard = false;
    criminal.hazard?.setEnabled(false);
    return true;
  }

  cuffNearest(position: Vector3): EntityState | null {
    const criminal = this.nearestCriminal(position, 5);
    if (!criminal || (!criminal.caught && !criminal.disarmed)) {
      return null;
    }
    criminal.cuffed = true;
    criminal.caught = true;
    criminal.baseSpeed = 0;
    this.addCuffBand(criminal.root);
    return criminal;
  }

  followCuffed(cuffedId: string | null, target: Vector3): void {
    if (!cuffedId) {
      return;
    }
    const criminal = this.records.get(cuffedId);
    if (!criminal) {
      return;
    }
    const follow = target.add(new Vector3(-1.3, -1.9, -1.3));
    criminal.root.position.copyFrom(follow);
  }

  getState(id: string): EntityState | null {
    return this.records.get(id) ?? null;
  }

  dispose(): void {
    this.records.forEach((record) => record.root.dispose(false, true));
    this.materials.forEach((material) => material.dispose());
  }

  private spawn(spawn: SpawnEntity, actual = false): EntityState | null {
    const definition = this.definitions.get(spawn.entityId);
    if (!definition) {
      return null;
    }
    const root = new TransformNode(`entity-${spawn.id}`, this.scene);
    root.position.set(spawn.x, spawn.y, spawn.z);
    root.rotation.y = spawn.yaw ?? 0;

    const body = MeshBuilder.CreateBox(`entity-${spawn.id}-body`, { width: 1, height: 1.8, depth: 0.72 }, this.scene);
    body.parent = root;
    body.position.y = 1.2;
    body.material = this.getMaterial(definition.id, definition.color);

    const head = MeshBuilder.CreateBox(`entity-${spawn.id}-head`, { size: 0.78 }, this.scene);
    head.parent = root;
    head.position.y = 2.55;
    head.material = this.getMaterial(`${definition.id}-head`, "#ffd0a6");

    const hat = MeshBuilder.CreateBox(`entity-${spawn.id}-hat`, { width: 0.95, height: 0.24, depth: 0.85 }, this.scene);
    hat.parent = root;
    hat.position.y = 3.05;
    hat.material = this.getMaterial(`${definition.id}-hat`, definition.role === "criminal" ? "#2b2f37" : "#2446c7");

    let hazard: Mesh | undefined;
    if (definition.role === "criminal" && actual) {
      hazard = MeshBuilder.CreateBox(`entity-${spawn.id}-hazard`, { width: 0.18, height: 0.18, depth: 0.95 }, this.scene);
      hazard.parent = root;
      hazard.position.set(0.58, 1.55, 0.35);
      hazard.material = this.getMaterial("toy-hazard", "#ff4d4d");
    }

    const record: EntityRecord = {
      id: spawn.id,
      role: definition.role,
      label: definition.label,
      meshName: root.name,
      root,
      caught: false,
      cuffed: false,
      disarmed: !actual,
      hasHazard: Boolean(hazard),
      hazard,
      baseSpeed: actual ? 2.8 : 1.6,
      home: root.position.clone(),
      wanderSeed: Math.random() * 20,
      wanderRadius: definition.role === "criminal" ? 0 : 3.2
    };
    this.records.set(spawn.id, record);
    return record;
  }

  private remove(id: string): void {
    const existing = this.records.get(id);
    if (!existing) {
      return;
    }
    existing.root.dispose(false, true);
    this.records.delete(id);
  }

  private addCuffBand(root: TransformNode): void {
    const band = MeshBuilder.CreateBox(`${root.name}-cuffs`, { width: 1.05, height: 0.16, depth: 0.16 }, this.scene);
    band.parent = root;
    band.position.set(0, 1.65, -0.45);
    band.material = this.getMaterial("cuff-silver", "#cbd5e1");
  }

  private getMaterial(id: string, color: string): StandardMaterial {
    const existing = this.materials.get(id);
    if (existing) {
      return existing;
    }
    const material = new StandardMaterial(`entity-material-${id}`, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    this.materials.set(id, material);
    return material;
  }
}
