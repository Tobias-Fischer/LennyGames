import { Ray } from "@babylonjs/core/Culling/ray.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { clearThemeSave, loadSavedWorld, saveWorld, type SavedWorld } from "./storage";
import type { BlockDefinition, PickedBlock, SpawnBlock, ThemePack } from "./types";

interface BlockRecord {
  x: number;
  y: number;
  z: number;
  typeId: string;
  mesh: Mesh;
  protected: boolean;
  initial: boolean;
}

const blockSize = 2;

export class VoxelWorld {
  readonly size = blockSize;
  private readonly blocks = new Map<string, BlockRecord>();
  private readonly materials = new Map<string, StandardMaterial>();
  private readonly definitions = new Map<string, BlockDefinition>();
  private readonly initialKeys = new Set<string>();
  private readonly saved: SavedWorld;
  private readonly floorBlockIds = new Set<string>();

  constructor(
    private readonly scene: Scene,
    private readonly theme: ThemePack
  ) {
    theme.blocks.forEach((block) => this.definitions.set(block.id, block));
    theme.blocks
      .filter((block) => /floor|lot|sidewalk|grass|pad|zone/i.test(block.id))
      .forEach((block) => this.floorBlockIds.add(block.id));
    this.saved = loadSavedWorld(theme.id, theme.worldVersion);
    this.buildBaseGround();
    this.buildSpawnBlocks(theme.spawnScene.blocks);
    this.restoreSavedBlocks();
  }

  static key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  getHeightAt(x: number, z: number): number {
    const gridX = Math.round(x / blockSize);
    const gridZ = Math.round(z / blockSize);
    let top = 0;
    this.blocks.forEach((block) => {
      if (block.x === gridX && block.z === gridZ && this.floorBlockIds.has(block.typeId)) {
        top = Math.max(top, (block.y + 1) * blockSize);
      }
    });
    return Math.max(2, top) + 0.9;
  }

  collidesWithPlayer(position: Vector3): boolean {
    const radius = 0.48;
    const feet = position.y - 0.82;
    const head = position.y + 0.45;
    const samples = [
      [position.x - radius, position.z - radius],
      [position.x + radius, position.z - radius],
      [position.x - radius, position.z + radius],
      [position.x + radius, position.z + radius]
    ];

    return samples.some(([x, z]) => {
      const gridX = Math.round(x / blockSize);
      const gridZ = Math.round(z / blockSize);
      for (const block of this.blocks.values()) {
        if (block.x !== gridX || block.z !== gridZ || this.floorBlockIds.has(block.typeId)) {
          continue;
        }
        const bottom = block.y * blockSize;
        const top = bottom + blockSize;
        if (top > feet && bottom < head) {
          return true;
        }
      }
      return false;
    });
  }

  pickFromCamera(position: Vector3, forward: Vector3, distance = 8): PickedBlock | null {
    const ray = new Ray(position, forward.normalize(), distance);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh.metadata?.voxelKey !== undefined);
    if (!hit?.pickedMesh || !hit.pickedPoint) {
      return null;
    }
    const key = hit.pickedMesh.metadata.voxelKey as string;
    const record = this.blocks.get(key);
    if (!record) {
      return null;
    }
    const normal = hit.getNormal(true) ?? Vector3.Up();
    return { key, x: record.x, y: record.y, z: record.z, normal };
  }

  placeAdjacent(picked: PickedBlock, typeId: string): boolean {
    const x = picked.x + Math.round(picked.normal.x);
    const y = picked.y + Math.round(picked.normal.y);
    const z = picked.z + Math.round(picked.normal.z);
    if (y < 0 || y > 10 || Math.abs(x) > 66 || Math.abs(z) > 66) {
      return false;
    }
    const key = VoxelWorld.key(x, y, z);
    if (this.blocks.has(key)) {
      return false;
    }
    this.addBlock({ x, y, z, typeId }, false, false);
    this.saved.addedBlocks.push({ x, y, z, typeId });
    this.persist();
    return true;
  }

  breakBlock(picked: PickedBlock): boolean {
    const record = this.blocks.get(picked.key);
    if (!record || record.protected) {
      return false;
    }
    record.mesh.dispose();
    this.blocks.delete(picked.key);
    if (record.initial) {
      this.saved.removedInitialBlockKeys.push(picked.key);
    } else {
      this.saved.addedBlocks = this.saved.addedBlocks.filter(
        (block) => VoxelWorld.key(block.x, block.y, block.z) !== picked.key
      );
    }
    this.persist();
    return true;
  }

  reset(): void {
    clearThemeSave(this.theme.id);
    window.location.reload();
  }

  dispose(): void {
    this.blocks.forEach((block) => block.mesh.dispose());
    this.materials.forEach((material) => material.dispose());
  }

  private buildBaseGround(): void {
    const ground = MeshBuilder.CreateGround("town-ground", { width: 170, height: 170 }, this.scene);
    const material = new StandardMaterial("ground-material", this.scene);
    material.diffuseColor = Color3.FromHexString(this.theme.palette.grass ?? "#6fc66b");
    ground.material = material;

    const road = MeshBuilder.CreateBox("main-road", { width: 13, height: 0.05, depth: 160 }, this.scene);
    road.position.set(0, 0.08, 0);
    const roadMaterial = new StandardMaterial("road-material", this.scene);
    roadMaterial.diffuseColor = Color3.FromHexString("#3f4652");
    road.material = roadMaterial;

    const crossing = MeshBuilder.CreateBox("cross-road", { width: 160, height: 0.05, depth: 9 }, this.scene);
    crossing.position.set(0, 0.09, -24);
    crossing.material = roadMaterial;

    const northRoad = MeshBuilder.CreateBox("north-cross-road", { width: 130, height: 0.05, depth: 9 }, this.scene);
    northRoad.position.set(8, 0.1, 24);
    northRoad.material = roadMaterial;
  }

  private buildSpawnBlocks(blocks: SpawnBlock[]): void {
    const removed = new Set(this.saved.removedInitialBlockKeys);
    blocks.forEach((block) => {
      const key = VoxelWorld.key(block.x, block.y, block.z);
      this.initialKeys.add(key);
      if (!removed.has(key)) {
        this.addBlock(block, Boolean(block.protected), true);
      }
    });
  }

  private restoreSavedBlocks(): void {
    this.saved.addedBlocks.forEach((block) => {
      const key = VoxelWorld.key(block.x, block.y, block.z);
      if (!this.blocks.has(key)) {
        this.addBlock(block, false, false);
      }
    });
  }

  private addBlock(block: Omit<SpawnBlock, "protected">, protectedBlock: boolean, initial: boolean): void {
    const key = VoxelWorld.key(block.x, block.y, block.z);
    const mesh = MeshBuilder.CreateBox(`block-${key}`, { size: blockSize }, this.scene);
    mesh.position.set(block.x * blockSize, block.y * blockSize + blockSize / 2, block.z * blockSize);
    mesh.material = this.getMaterial(block.typeId);
    mesh.checkCollisions = true;
    mesh.metadata = { voxelKey: key };
    this.blocks.set(key, {
      x: block.x,
      y: block.y,
      z: block.z,
      typeId: block.typeId,
      mesh,
      protected: protectedBlock,
      initial
    });
  }

  private getMaterial(typeId: string): StandardMaterial {
    const existing = this.materials.get(typeId);
    if (existing) {
      return existing;
    }
    const definition = this.definitions.get(typeId);
    const material = new StandardMaterial(`block-material-${typeId}`, this.scene);
    const base = definition?.color ?? "#ffffff";
    const texture = new DynamicTexture(`block-texture-${typeId}`, { width: 64, height: 64 }, this.scene, false);
    const context = texture.getContext();
    context.fillStyle = base;
    context.fillRect(0, 0, 64, 64);
    const color = Color3.FromHexString(base);
    const shade = (amount: number) =>
      `rgb(${Math.max(0, Math.min(255, Math.round(color.r * 255 * amount)))}, ${Math.max(
        0,
        Math.min(255, Math.round(color.g * 255 * amount))
      )}, ${Math.max(0, Math.min(255, Math.round(color.b * 255 * amount)))})`;
    for (let y = 0; y < 64; y += 16) {
      for (let x = 0; x < 64; x += 16) {
        const hash = (x * 13 + y * 7 + typeId.length * 19) % 5;
        context.fillStyle = shade(0.82 + hash * 0.055);
        context.fillRect(x + 1, y + 1, 14, 14);
      }
    }
    context.strokeStyle = shade(0.72);
    context.lineWidth = 1;
    for (let line = 0; line <= 64; line += 16) {
      context.beginPath();
      context.moveTo(line, 0);
      context.lineTo(line, 64);
      context.stroke();
      context.beginPath();
      context.moveTo(0, line);
      context.lineTo(64, line);
      context.stroke();
    }
    texture.update();
    material.diffuseTexture = texture;
    material.diffuseColor = Color3.White();
    material.specularColor = Color3.Black();
    this.materials.set(typeId, material);
    return material;
  }

  private persist(): void {
    this.saved.removedInitialBlockKeys = Array.from(new Set(this.saved.removedInitialBlockKeys));
    this.saved.addedBlocks = this.saved.addedBlocks.filter((block) => {
      const key = VoxelWorld.key(block.x, block.y, block.z);
      return !this.initialKeys.has(key);
    });
    saveWorld(this.theme.id, this.saved);
  }
}
