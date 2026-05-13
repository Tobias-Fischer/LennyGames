import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { Scene } from "@babylonjs/core/scene.js";
import { AudioSystem } from "./AudioSystem";
import { EntitySystem } from "./EntitySystem";
import { Hud } from "./Hud";
import { InputController } from "./InputController";
import { InteractionSystem } from "./InteractionSystem";
import { MissionSystem } from "./MissionSystem";
import type { ThemePack, ToolDefinition } from "./types";
import { VoxelWorld } from "./VoxelWorld";

type MissionId = "practice-call" | "actual-call" | "donut-call";

export class GameApp {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly input: InputController;
  private readonly hud: Hud;
  private readonly world: VoxelWorld;
  private readonly entities: EntitySystem;
  private readonly missions: MissionSystem;
  private readonly audio: AudioSystem;
  private readonly interactions: InteractionSystem;
  private readonly policeCar: Mesh;
  private readonly missionMarker: Mesh;
  private readonly resizeHandler: () => void;
  private selectedTool: ToolDefinition;
  private health = 100;
  private verticalVelocity = 0;
  private grounded = true;
  private driving = false;
  private interactionMessage = "";
  private interactionMessageUntil = 0;

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
    this.camera.maxZ = 200;

    this.setupLighting();
    this.world = new VoxelWorld(this.scene, theme);
    this.entities = new EntitySystem(this.scene, theme);
    this.missions = new MissionSystem(theme);
    this.audio = new AudioSystem();
    this.interactions = new InteractionSystem();
    this.policeCar = this.createPoliceCar();
    this.missionMarker = this.createMissionMarker();

    this.input = new InputController(canvas);
    uiRoot.append(this.input.root);
    this.selectedTool = theme.tools[0];
    this.hud = new Hud(theme.tools, {
      selectTool: (toolId) => this.selectTool(toolId),
      useTool: () => this.useSelectedTool(),
      jump: () => this.jump(),
      enterVehicle: () => this.toggleVehicle(),
      toggleMute: () => this.audio.toggleMute(),
      startPractice: () => this.startMission("practice-call"),
      startActual: () => this.startMission("actual-call"),
      resetWorld: () => this.world.reset()
    });
    uiRoot.append(this.hud.root);

    this.resizeHandler = () => this.engine.resize();
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("pointerdown", () => this.audio.unlock(), { once: true });
    window.addEventListener("keydown", () => this.audio.unlock(), { once: true });
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
    this.audio.dispose();
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
      new Vector3(this.theme.spawnScene.jailDrop.x, this.theme.spawnScene.jailDrop.y, this.theme.spawnScene.jailDrop.z)
    );
    this.updateMissionMarker(dt);
    this.checkHazards(dt);
    this.updateHud();
  }

  private updatePlayer(dt: number): void {
    const previous = this.camera.position.clone();
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
    const speed = 7.4;
    this.camera.position.addInPlace(movement.scale(speed * dt));
    this.camera.position.x = Math.max(-62, Math.min(62, this.camera.position.x));
    this.camera.position.z = Math.max(-62, Math.min(62, this.camera.position.z));
    if (this.world.collidesWithPlayer(this.camera.position)) {
      this.camera.position.x = previous.x;
      this.camera.position.z = previous.z;
    }

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
    this.policeCar.position.addInPlace(forward.scale(this.input.moveZ * dt * 11));
    this.policeCar.position.x = Math.max(-58, Math.min(58, this.policeCar.position.x));
    this.policeCar.position.z = Math.max(-58, Math.min(58, this.policeCar.position.z));
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
    this.audio.unlock();
    if (this.selectedTool.kind === "radio") {
      this.startMission("actual-call");
      this.audio.play("siren");
      return;
    }
    const picked = this.world.pickFromCamera(
      this.camera.position,
      this.camera.getDirection(Vector3.Forward()),
      this.selectedTool.kind === "weapon" || this.selectedTool.kind === "taser" ? 12 : 8
    );

    if (this.selectedTool.kind === "buildTool") {
      if (picked && this.world.placeAdjacent(picked, "blue")) {
        this.say("Block placed.");
        this.audio.play("click");
      } else {
        this.say("Aim at a block to build.");
        this.audio.play("blocked");
      }
      return;
    }
    if (this.selectedTool.kind === "breakTool") {
      if (picked && this.world.breakBlock(picked)) {
        this.say("Block removed.");
        this.audio.play("click");
      } else {
        this.say("That building is protected.");
        this.audio.play("blocked");
      }
      return;
    }
    if (this.selectedTool.kind === "taser") {
      const target = this.entities.nearestCriminalTarget(this.camera.position, 12);
      if (target && this.entities.stunNearest(this.camera.position)) {
        this.createBeam(target.position, "#38bdf8");
        this.say("Taser hit. Use cuffs!");
        this.audio.play("taser");
        this.missions.markDisarmed();
      } else {
        this.say("No criminal in taser range.");
        this.audio.play("blocked");
      }
      return;
    }
    if (this.selectedTool.kind === "weapon") {
      const target = this.entities.nearestCriminalTarget(this.camera.position, 14);
      if (target && this.entities.disarmNearest(this.camera.position)) {
        this.createBeam(target.position, "#f97316");
        this.say("Blaster pop. Criminal disarmed!");
        this.audio.play("blaster");
        this.missions.markDisarmed();
      } else {
        this.say("No criminal in blaster range.");
        this.audio.play("blocked");
      }
      return;
    }
    if (this.selectedTool.kind === "handcuffs") {
      const cuffed = this.entities.cuffNearest(this.camera.position);
      if (cuffed) {
        this.say("Criminal cuffed. Take them to jail.");
        this.audio.play("cuffs");
        this.missions.markCuffed(cuffed);
      } else {
        this.say("Go closer after stunning or disarming.");
        this.audio.play("blocked");
      }
    }
  }

  private selectTool(toolId: string): void {
    const tool = this.theme.tools.find((candidate) => candidate.id === toolId);
    if (tool) {
      this.selectedTool = tool;
      this.audio.play("click");
    }
  }

  private startMission(id: MissionId): void {
    const definition = this.missions.start(id);
    const location = this.theme.missionLocations.find((candidate) => candidate.id === definition.locationId);
    if (!location) {
      return;
    }
    this.entities.spawnCriminalAt(
      new Vector3(location.criminalSpawn.x, location.criminalSpawn.y, location.criminalSpawn.z),
      !definition.isPractice,
      `${id}-criminal`,
      location.criminalSpawn.yaw ?? Math.PI
    );
    this.say(definition.alarmText);
    this.audio.play(definition.isPractice ? "alarm" : "siren");
  }

  private toggleVehicle(): void {
    if (this.driving) {
      this.driving = false;
      this.camera.position.copyFrom(this.policeCar.position.add(new Vector3(2.6, 2.9, 0)));
      this.say("Exited police car.");
      return;
    }
    if (Vector3.Distance(this.camera.position, this.policeCar.position) < 7) {
      this.driving = true;
      this.say("Driving police car.");
      this.audio.play("car");
    } else {
      this.say("Walk closer to the police car.");
      this.audio.play("blocked");
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
    this.audio.play("damage");
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
    this.say("Respawned at the police station with all gear.");
  }

  private updateHud(): void {
    const mission = this.missions.getHudText();
    this.hud.update({
      health: this.health,
      selectedToolId: this.selectedTool.id,
      alarmActive: mission.alarmActive,
      missionTitle: mission.title,
      missionText: mission.text,
      interactionText: this.getInteractionText(),
      driving: this.driving,
      muted: this.audio.muted
    });
  }

  private getInteractionText(): string {
    if (performance.now() < this.interactionMessageUntil) {
      return this.interactionMessage;
    }
    const target = this.entities.nearestCriminalTarget(this.camera.position, 18);
    return this.interactions.describe(this.selectedTool, target, this.driving);
  }

  private say(message: string): void {
    this.interactionMessage = message;
    this.interactionMessageUntil = performance.now() + 2200;
  }

  private updateMissionMarker(dt: number): void {
    const location = this.missions.getActiveLocation();
    if (!location) {
      this.missionMarker.setEnabled(false);
      return;
    }
    this.missionMarker.setEnabled(true);
    this.missionMarker.position.set(
      location.callPoint.x,
      3.2 + Math.sin(performance.now() / 240) * 0.45,
      location.callPoint.z
    );
    this.missionMarker.rotation.y += dt * 1.5;
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

  private createMissionMarker(): Mesh {
    const marker = MeshBuilder.CreateBox("mission-marker", { width: 1.5, height: 1.5, depth: 1.5 }, this.scene);
    marker.setEnabled(false);
    const material = new StandardMaterial("mission-marker-material", this.scene);
    material.diffuseColor = Color3.FromHexString("#ffe85c");
    material.emissiveColor = Color3.FromHexString("#facc15");
    marker.material = material;
    return marker;
  }

  private createBeam(target: Vector3, color: string): void {
    const start = this.camera.position.add(this.camera.getDirection(Vector3.Forward()).scale(1.4));
    const midpoint = start.add(target).scale(0.5);
    const length = Vector3.Distance(start, target);
    const beam = MeshBuilder.CreateBox(`tool-beam-${performance.now()}`, { width: 0.12, height: 0.12, depth: length }, this.scene);
    beam.position.copyFrom(midpoint);
    beam.lookAt(target);
    const material = new StandardMaterial(`${beam.name}-material`, this.scene);
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = Color3.FromHexString(color);
    beam.material = material;
    window.setTimeout(() => {
      beam.dispose();
      material.dispose();
    }, 180);
  }
}
