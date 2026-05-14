import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import type { Scene } from "@babylonjs/core/scene.js";
import type { ThemePack, WorldLabel } from "./types";

export class WorldLabelSystem {
  private readonly meshes: Mesh[] = [];
  private readonly materials: StandardMaterial[] = [];
  private readonly textures: DynamicTexture[] = [];

  constructor(
    private readonly scene: Scene,
    theme: ThemePack
  ) {
    theme.labels.forEach((label) => this.createLabel(label));
  }

  dispose(): void {
    this.meshes.forEach((mesh) => mesh.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
  }

  private createLabel(label: WorldLabel): void {
    const width = Math.max(4.8, (label.size ?? 1) * (label.text.length * 0.34 + 1.8));
    const height = (label.size ?? 1) * 1.1;
    const position = new Vector3(label.x, label.y, label.z);

    const frame = MeshBuilder.CreateBox(`label-${label.id}-frame`, { width: width + 0.45, height: height + 0.35, depth: 0.18 }, this.scene);
    frame.position.copyFrom(position);
    frame.rotation.y = label.yaw;
    const frameMaterial = new StandardMaterial(`label-${label.id}-frame-material`, this.scene);
    frameMaterial.diffuseColor = Color3.FromHexString(label.backgroundColor ?? "#f8fafc");
    frameMaterial.specularColor = Color3.Black();
    frame.material = frameMaterial;

    const sign = MeshBuilder.CreatePlane(`label-${label.id}`, { width, height }, this.scene);
    sign.position.copyFrom(position.add(new Vector3(-Math.sin(label.yaw) * 0.13, 0, -Math.cos(label.yaw) * 0.13)));
    sign.rotation.y = label.yaw;
    const texture = new DynamicTexture(`label-texture-${label.id}`, { width: 512, height: 128 }, this.scene, true);
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.fillStyle = label.backgroundColor ?? "#f8fafc";
    context.fillRect(0, 0, 512, 128);
    context.strokeStyle = label.color;
    context.lineWidth = 8;
    context.strokeRect(8, 8, 496, 112);
    context.fillStyle = label.color;
    context.font = "bold 44px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label.text, 256, 66, 470);
    texture.update();

    const material = new StandardMaterial(`label-${label.id}-material`, this.scene);
    material.diffuseTexture = texture;
    material.diffuseColor = Color3.White();
    material.emissiveColor = Color3.FromHexString("#ffffff").scale(0.08);
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    sign.material = material;

    this.meshes.push(frame, sign);
    this.materials.push(frameMaterial, material);
    this.textures.push(texture);
  }
}
