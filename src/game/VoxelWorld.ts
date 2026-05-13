import { Ray } from "@babylonjs/core/Culling/ray.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
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

  constructor(
    private readonly scene: Scene,
    private readonly theme: ThemePack
  ) {
    theme.blocks.forEach((block) => this.definitions.set(block.id, block));
    this.saved = loadSavedWorld(theme.id);
    this.buildBaseGround();
    this.buildSpawnBlocks(theme.spawnScene.blocks);
    this.restoreSavedBlocks();
  }

  static key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  getHeightAt(_x: number, _z: number): number {
    return 2.9;
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
    if (y < 0 || y > 9 || Math.abs(x) > 30 || Math.abs(z) > 30) {
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
    const ground = MeshBuilder.CreateGround("town-ground", { width: 90, height: 90 }, this.scene);
    const material = new StandardMaterial("ground-material", this.scene);
    material.diffuseColor = Color3.FromHexString("#6fc66b");
    ground.material = material;

    const road = MeshBuilder.CreateBox("main-road", { width: 12, height: 0.08, depth: 90 }, this.scene);
    road.position.set(0, 0.04, 0);
    const roadMaterial = new StandardMaterial("road-material", this.scene);
    roadMaterial.diffuseColor = Color3.FromHexString("#3f4652");
    road.material = roadMaterial;

    const crossing = MeshBuilder.CreateBox("cross-road", { width: 90, height: 0.09, depth: 8 }, this.scene);
    crossing.position.set(0, 0.06, -16);
    crossing.material = roadMaterial;
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
    material.diffuseColor = Color3.FromHexString(definition?.color ?? "#ffffff");
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
