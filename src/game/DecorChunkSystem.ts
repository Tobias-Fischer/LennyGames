import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";
import type { DecorProfile, ThemePack } from "./types";

const chunkSize = 42;
const activeRadius = 1;

interface DecorChunk {
  key: string;
  root: TransformNode;
  lastSeen: number;
}

export class DecorChunkSystem {
  private readonly chunks = new Map<string, DecorChunk>();
  private readonly materials = new Map<string, StandardMaterial>();
  private tick = 0;

  constructor(
    private readonly scene: Scene,
    private readonly theme: ThemePack
  ) {}

  update(playerPosition: Vector3): void {
    this.tick += 1;
    if (this.tick % 15 !== 0) {
      return;
    }
    const cx = Math.floor(playerPosition.x / chunkSize);
    const cz = Math.floor(playerPosition.z / chunkSize);
    const needed = new Set<string>();

    for (let x = cx - activeRadius; x <= cx + activeRadius; x += 1) {
      for (let z = cz - activeRadius; z <= cz + activeRadius; z += 1) {
        const key = `${x},${z}`;
        needed.add(key);
        const existing = this.chunks.get(key);
        if (existing) {
          existing.root.setEnabled(true);
          existing.lastSeen = this.tick;
        } else {
          this.chunks.set(key, { key, root: this.createChunk(x, z, playerPosition), lastSeen: this.tick });
        }
      }
    }

    this.chunks.forEach((chunk, key) => {
      if (!needed.has(key)) {
        chunk.root.setEnabled(false);
      }
      if (this.tick - chunk.lastSeen > 120) {
        chunk.root.dispose(false, true);
        this.chunks.delete(key);
      }
    });
  }

  dispose(): void {
    this.chunks.forEach((chunk) => chunk.root.dispose(false, true));
    this.materials.forEach((material) => material.dispose());
  }

  private createChunk(cx: number, cz: number, playerPosition: Vector3): TransformNode {
    const root = new TransformNode(`decor-chunk-${cx}-${cz}`, this.scene);
    const profile = this.theme.decor;
    const seed = this.hash(cx, cz);
    const originX = cx * chunkSize;
    const originZ = cz * chunkSize;

    for (let i = 0; i < 8; i += 1) {
      const x = originX + this.random(seed, i * 3) * chunkSize - chunkSize / 2;
      const z = originZ + this.random(seed, i * 3 + 1) * chunkSize - chunkSize / 2;
      if (Math.abs(x) < 24 && Math.abs(z) < 24) {
        continue;
      }
      if (Vector3.DistanceSquared(new Vector3(x, playerPosition.y, z), playerPosition) < 34 * 34) {
        continue;
      }
      const roll = this.random(seed, i * 3 + 2);
      if (roll < 0.35) {
        this.createTree(root, x, z, profile);
      } else if (roll < 0.62) {
        this.createSmallBuilding(root, x, z, profile, 2 + Math.floor(this.random(seed, i + 40) * 3));
      } else if (roll < 0.82) {
        this.createLamp(root, x, z, profile);
      } else {
        this.createParkedProp(root, x, z, profile);
      }
    }

    return root;
  }

  private createSmallBuilding(root: TransformNode, x: number, z: number, profile: DecorProfile, height: number): void {
    const body = MeshBuilder.CreateBox(`decor-building-${root.name}-${x}-${z}`, { width: 7, height: height * 2, depth: 6 }, this.scene);
    body.parent = root;
    body.position.set(x, height, z);
    body.material = this.material("decor-building", profile.blockColor);
    const roof = MeshBuilder.CreateBox(`decor-roof-${root.name}-${x}-${z}`, { width: 7.5, height: 0.8, depth: 6.5 }, this.scene);
    roof.parent = root;
    roof.position.set(x, height * 2 + 0.45, z);
    roof.material = this.material("decor-roof", profile.roofColor);
    const sign = MeshBuilder.CreateBox(`decor-sign-${root.name}-${x}-${z}`, { width: 3.6, height: 0.45, depth: 0.2 }, this.scene);
    sign.parent = root;
    sign.position.set(x, height + 1.1, z - 3.12);
    sign.material = this.material("decor-accent", profile.accentColor);
  }

  private createTree(root: TransformNode, x: number, z: number, profile: DecorProfile): void {
    const trunk = MeshBuilder.CreateBox(`decor-tree-trunk-${root.name}-${x}-${z}`, { width: 0.8, height: 2.4, depth: 0.8 }, this.scene);
    trunk.parent = root;
    trunk.position.set(x, 1.2, z);
    trunk.material = this.material("decor-trunk", "#8b5a2b");
    const leaf = MeshBuilder.CreateBox(`decor-tree-leaf-${root.name}-${x}-${z}`, { width: 3.2, height: 2.5, depth: 3.2 }, this.scene);
    leaf.parent = root;
    leaf.position.set(x, 3.2, z);
    leaf.material = this.material(`decor-leaf-${profile.kind}`, profile.kind === "base" ? "#4d6b3b" : "#22c55e");
  }

  private createLamp(root: TransformNode, x: number, z: number, profile: DecorProfile): void {
    const post = MeshBuilder.CreateBox(`decor-lamp-post-${root.name}-${x}-${z}`, { width: 0.24, height: 4.2, depth: 0.24 }, this.scene);
    post.parent = root;
    post.position.set(x, 2.1, z);
    post.material = this.material("decor-lamp-post", "#334155");
    const lamp = MeshBuilder.CreateBox(`decor-lamp-${root.name}-${x}-${z}`, { width: 1, height: 0.5, depth: 1 }, this.scene);
    lamp.parent = root;
    lamp.position.set(x, 4.45, z);
    lamp.material = this.material(`decor-light-${profile.kind}`, profile.accentColor);
  }

  private createParkedProp(root: TransformNode, x: number, z: number, profile: DecorProfile): void {
    const base = MeshBuilder.CreateBox(`decor-prop-${root.name}-${x}-${z}`, { width: 3, height: 0.8, depth: 4.4 }, this.scene);
    base.parent = root;
    base.position.set(x, 0.4, z);
    base.rotation.y = this.random(this.hash(Math.round(x), Math.round(z)), 2) * Math.PI;
    base.material = this.material(`decor-prop-${profile.kind}`, profile.accentColor);
    const top = MeshBuilder.CreateBox(`decor-prop-top-${root.name}-${x}-${z}`, { width: 2, height: 0.8, depth: 1.8 }, this.scene);
    top.parent = root;
    top.position.set(x, 1.2, z);
    top.rotation.y = base.rotation.y;
    top.material = this.material("decor-prop-top", "#f8fafc");
  }

  private material(id: string, color: string): StandardMaterial {
    const existing = this.materials.get(id);
    if (existing) {
      return existing;
    }
    const material = new StandardMaterial(id, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    this.materials.set(id, material);
    return material;
  }

  private hash(x: number, z: number): number {
    return Math.abs((x * 73856093) ^ (z * 19349663) ^ this.theme.id.length * 83492791);
  }

  private random(seed: number, salt: number): number {
    const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }
}
