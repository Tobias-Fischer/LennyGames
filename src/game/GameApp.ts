import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { Scene } from "@babylonjs/core/scene.js";
import { EntitySystem } from "./EntitySystem";
import { Hud } from "./Hud";
import { InputController } from "./InputController";
import { MissionSystem } from "./MissionSystem";
import type { ThemePack, ToolDefinition } from "./types";
import { VoxelWorld } from "./VoxelWorld";

export class GameApp {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly input: InputController;
  private readonly hud: Hud;
  private readonly world: VoxelWorld;
  private readonly entities: EntitySystem;
  private readonly missions: MissionSystem;
  private readonly policeCar: Mesh;
  private readonly resizeHandler: () => void;
  private selectedTool: ToolDefinition;
  private health = 100;
  private verticalVelocity = 0;
  private grounded = true;
  private driving = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    uiRoot: HTMLDivElement,
    private readonly theme: ThemePack
  ) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor.set(0.53, 0.81, 0.96, 1);
    this.scene.collisionsEnabled = true;

    const spawn = theme.spawnScene.playerSpawn;
    this.camera = new FreeCamera("first-person-camera", new Vector3(spawn.x, spawn.y, spawn.z), this.scene);
    this.camera.rotation.y = spawn.yaw;
    this.camera.minZ = 0.08;
    this.camera.maxZ = 180;

    this.setupLighting();
    this.world = new VoxelWorld(this.scene, theme);
    this.entities = new EntitySystem(this.scene, theme);
    this.missions = new MissionSystem(theme);
    this.policeCar = this.createPoliceCar();

    this.input = new InputController(canvas);
    uiRoot.append(this.input.root);
    this.selectedTool = theme.tools[0];
    this.hud = new Hud(theme.tools, {
      selectTool: (toolId) => this.selectTool(toolId),
      useTool: () => this.useSelectedTool(),
      jump: () => this.jump(),
      enterVehicle: () => this.toggleVehicle(),
      startPractice: () => this.startMission("practice-call"),
      startActual: () => this.startMission("actual-call"),
      resetWorld: () => this.world.reset()
    });
    uiRoot.append(this.hud.root);

    this.resizeHandler = () => this.engine.resize();
    window.addEventListener("resize", this.resizeHandler);
  }

  start(): void {
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
      this.update(dt);
      this.scene.render();
    });
  }

  dispose(): void {
    window.removeEventListener("resize", this.resizeHandler);
    this.engine.stopRenderLoop();
    this.hud.dispose();
    this.input.dispose();
    this.entities.dispose();
    this.world.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  private update(dt: number): void {
    this.input.updateCameraLook(this.camera, dt);
    if (this.input.consumeUse()) {
      this.useSelectedTool();
    }
    if (this.input.consumeEnter()) {
      this.toggleVehicle();
    }
    if (this.input.jumpPressed) {
      this.jump();
    }

    if (this.driving) {
      this.updateVehicle(dt);
    } else {
      this.updatePlayer(dt);
    }

    const playerPosition = this.camera.position.clone();
    this.entities.update(dt, playerPosition);
    this.entities.followCuffed(this.missions.getCuffedCriminalId(), playerPosition);
    this.missions.update(
      playerPosition,
      new Vector3(this.theme.spawnScene.jailDrop.x, this.theme.spawnScene.jailDrop.y, this.theme.spawnScene.jailDrop.z),
      new Vector3(this.theme.spawnScene.shopCall.x, this.theme.spawnScene.shopCall.y, this.theme.spawnScene.shopCall.z)
    );
    this.checkHazards(dt);
    this.updateHud();
  }

  private updatePlayer(dt: number): void {
    const forward = this.camera.getDirection(Vector3.Forward());
    forward.y = 0;
    forward.normalize();
    const right = this.camera.getDirection(Vector3.Right());
    right.y = 0;
    right.normalize();
    const movement = forward.scale(this.input.moveZ).add(right.scale(this.input.moveX));
    if (movement.length() > 1) {
      movement.normalize();
    }
    const speed = 7;
    this.camera.position.addInPlace(movement.scale(speed * dt));

    this.verticalVelocity -= 18 * dt;
    this.camera.position.y += this.verticalVelocity * dt;
    const floor = this.world.getHeightAt(this.camera.position.x, this.camera.position.z);
    if (this.camera.position.y <= floor) {
      this.camera.position.y = floor;
      this.verticalVelocity = 0;
      this.grounded = true;
    }
  }

  private updateVehicle(dt: number): void {
    this.policeCar.rotation.y += this.input.moveX * dt * 1.8;
    const forward = new Vector3(Math.sin(this.policeCar.rotation.y), 0, Math.cos(this.policeCar.rotation.y));
    this.policeCar.position.addInPlace(forward.scale(this.input.moveZ * dt * 10));
    this.camera.position.copyFrom(this.policeCar.position.add(new Vector3(0, 3.5, -0.4)));
    this.camera.rotation.y = this.policeCar.rotation.y;
    this.camera.rotation.x = 0.05;
  }

  private jump(): void {
    if (!this.grounded || this.driving) {
      return;
    }
    this.verticalVelocity = 7.2;
    this.grounded = false;
  }

  private useSelectedTool(): void {
    if (this.selectedTool.kind === "radio") {
      this.startMission("actual-call");
      return;
    }
    const picked = this.world.pickFromCamera(
      this.camera.position,
      this.camera.getDirection(Vector3.Forward()),
      this.selectedTool.kind === "weapon" || this.selectedTool.kind === "taser" ? 12 : 8
    );

    if (this.selectedTool.kind === "buildTool" && picked) {
      this.world.placeAdjacent(picked, "blue");
      return;
    }
    if (this.selectedTool.kind === "breakTool" && picked) {
      this.world.breakBlock(picked);
      return;
    }
    if (this.selectedTool.kind === "taser") {
      if (this.entities.stunNearest(this.camera.position)) {
        this.missions.markDisarmed();
      }
      return;
    }
    if (this.selectedTool.kind === "weapon") {
      if (this.entities.disarmNearest(this.camera.position)) {
        this.missions.markDisarmed();
      }
      return;
    }
    if (this.selectedTool.kind === "handcuffs") {
      const cuffed = this.entities.cuffNearest(this.camera.position);
      if (cuffed) {
        this.missions.markCuffed(cuffed);
      }
    }
  }

  private selectTool(toolId: string): void {
    const tool = this.theme.tools.find((candidate) => candidate.id === toolId);
    if (tool) {
      this.selectedTool = tool;
    }
  }

  private startMission(id: "practice-call" | "actual-call"): void {
    const definition = this.missions.start(id);
    this.entities.spawnCriminalAt(
      new Vector3(this.theme.spawnScene.shopCall.x, this.theme.spawnScene.shopCall.y, this.theme.spawnScene.shopCall.z),
      !definition.isPractice
    );
  }

  private toggleVehicle(): void {
    if (this.driving) {
      this.driving = false;
      this.camera.position.copyFrom(this.policeCar.position.add(new Vector3(2.6, 2.9, 0)));
      return;
    }
    if (Vector3.Distance(this.camera.position, this.policeCar.position) < 7) {
      this.driving = true;
    }
  }

  private checkHazards(dt: number): void {
    if (!this.missions.isActiveActual()) {
      return;
    }
    const criminal = this.entities.nearestCriminal(this.camera.position, 4.5);
    if (!criminal || criminal.cuffed || criminal.disarmed) {
      return;
    }
    this.health = Math.max(0, this.health - Math.ceil(18 * dt));
    if (this.health <= 0) {
      this.respawn();
    }
  }

  private respawn(): void {
    const spawn = this.theme.spawnScene.playerSpawn;
    this.health = 100;
    this.driving = false;
    this.verticalVelocity = 0;
    this.camera.position.set(spawn.x, spawn.y, spawn.z);
    this.camera.rotation.set(0, spawn.yaw, 0);
  }

  private updateHud(): void {
    const mission = this.missions.getHudText();
    this.hud.update({
      health: this.health,
      selectedToolId: this.selectedTool.id,
      alarmActive: mission.alarmActive,
      missionTitle: mission.title,
      missionText: mission.text,
      driving: this.driving
    });
  }

  private setupLighting(): void {
    const light = new HemisphericLight("sunny-sky", new Vector3(0.4, 1, 0.2), this.scene);
    light.intensity = 0.92;
    light.groundColor = Color3.FromHexString("#6fc66b");
  }

  private createPoliceCar(): Mesh {
    const root = MeshBuilder.CreateBox("police-car", { width: 3.4, height: 1.1, depth: 5.1 }, this.scene);
    root.position.set(
      this.theme.spawnScene.policeCar.x,
      this.theme.spawnScene.policeCar.y,
      this.theme.spawnScene.policeCar.z
    );
    root.rotation.y = this.theme.spawnScene.policeCar.yaw;
    const bodyMaterial = new StandardMaterial("police-car-blue", this.scene);
    bodyMaterial.diffuseColor = Color3.FromHexString("#2446c7");
    root.material = bodyMaterial;

    const cabin = MeshBuilder.CreateBox("police-car-cabin", { width: 2.5, height: 1, depth: 2.4 }, this.scene);
    cabin.parent = root;
    cabin.position.y = 0.95;
    const cabinMaterial = new StandardMaterial("police-car-white", this.scene);
    cabinMaterial.diffuseColor = Color3.FromHexString("#f8fafc");
    cabin.material = cabinMaterial;

    const light = MeshBuilder.CreateBox("police-car-light", { width: 1.3, height: 0.22, depth: 0.36 }, this.scene);
    light.parent = root;
    light.position.y = 1.58;
    const lightMaterial = new StandardMaterial("police-car-light-material", this.scene);
    lightMaterial.diffuseColor = Color3.FromHexString("#ff3b3b");
    light.material = lightMaterial;
    return root;
  }
}
