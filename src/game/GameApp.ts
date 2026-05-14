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
import { DecorChunkSystem } from "./DecorChunkSystem";
import { EntitySystem } from "./EntitySystem";
import { Hud } from "./Hud";
import { InputController } from "./InputController";
import { InteractionSystem } from "./InteractionSystem";
import { MissionSystem } from "./MissionSystem";
import type { ThemePack, ToolDefinition, VehicleDefinition } from "./types";
import { VoxelWorld } from "./VoxelWorld";
import { WorldLabelSystem } from "./WorldLabelSystem";

interface VehicleInstance {
  definition: VehicleDefinition;
  mesh: Mesh;
}

export class GameApp {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: FreeCamera;
  private readonly input: InputController;
  private readonly hud: Hud;
  private readonly world: VoxelWorld;
  private readonly entities: EntitySystem;
  private readonly labels: WorldLabelSystem;
  private readonly decor: DecorChunkSystem;
  private readonly missions: MissionSystem;
  private readonly audio: AudioSystem;
  private readonly interactions: InteractionSystem;
  private readonly vehicles: VehicleInstance[];
  private readonly missionMarker: Mesh;
  private readonly resizeHandler: () => void;
  private selectedTool: ToolDefinition;
  private health = 100;
  private verticalVelocity = 0;
  private grounded = true;
  private activeVehicle: VehicleInstance | null = null;
  private interactionMessage = "";
  private interactionMessageUntil = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    uiRoot: HTMLDivElement,
    private readonly theme: ThemePack,
    private readonly onChangeWorld?: () => void
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
    this.entities = new EntitySystem(this.scene, theme, (from, to, radius) => this.world.canMoveEntity(from, to, radius));
    this.labels = new WorldLabelSystem(this.scene, theme);
    this.decor = new DecorChunkSystem(this.scene, theme);
    this.missions = new MissionSystem(theme);
    this.audio = new AudioSystem();
    this.audio.restoreMusicPreference();
    this.interactions = new InteractionSystem();
    this.vehicles = theme.spawnScene.vehicles.map((vehicle) => ({ definition: vehicle, mesh: this.createVehicle(vehicle) }));
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
      toggleMusic: () => this.audio.toggleMusic(),
      startPractice: () => this.startFirstMission(true),
      startActual: () => this.startFirstMission(false),
      changeWorld: () => this.onChangeWorld?.(),
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
    this.labels.dispose();
    this.decor.dispose();
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

    if (this.activeVehicle) {
      this.updateVehicle(dt);
    } else {
      this.updatePlayer(dt);
    }

    const playerPosition = this.camera.position.clone();
    this.entities.update(dt, playerPosition);
    this.entities.followCuffed(this.missions.getCuffedCriminalId(), playerPosition);
    this.decor.update(playerPosition);
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
    const speed = 9.4;
    this.camera.position.addInPlace(movement.scale(speed * dt));
    this.camera.position.x = Math.max(-118, Math.min(118, this.camera.position.x));
    this.camera.position.z = Math.max(-118, Math.min(118, this.camera.position.z));
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
    if (!this.activeVehicle) {
      return;
    }
    const { definition, mesh } = this.activeVehicle;
    mesh.rotation.y += this.input.moveX * dt * (definition.turnSpeed ?? (definition.kind === "tank" ? 1.25 : 2.05));
    const forward = new Vector3(Math.sin(mesh.rotation.y), 0, Math.cos(mesh.rotation.y));
    const speed = definition.speed ?? (definition.kind === "bike" ? 14 : definition.kind === "plane" ? 18 : 12);
    mesh.position.addInPlace(forward.scale(this.input.moveZ * dt * speed));
    mesh.position.x = Math.max(-114, Math.min(114, mesh.position.x));
    mesh.position.z = Math.max(-114, Math.min(114, mesh.position.z));
    const rideHeight = definition.kind === "plane" ? 4.7 : definition.kind === "bike" ? 2.8 : 3.7;
    this.camera.position.copyFrom(mesh.position.add(new Vector3(0, rideHeight, -0.4)));
    this.camera.rotation.y = mesh.rotation.y;
    this.camera.rotation.x = definition.kind === "plane" ? -0.02 : 0.05;
  }

  private jump(): void {
    if (!this.grounded || this.activeVehicle) {
      return;
    }
    this.verticalVelocity = 7.2;
    this.grounded = false;
  }

  private useSelectedTool(): void {
    this.audio.unlock();
    if (this.selectedTool.kind === "radio") {
      this.startFirstMission(false);
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
        this.say(`${this.selectedTool.label} hit. Use the finish tool!`);
        this.audio.play(this.theme.id === "pizza" ? "order" : "taser");
        this.missions.markDisarmed();
      } else {
        this.say(`No target in ${this.selectedTool.label} range.`);
        this.audio.play("blocked");
      }
      return;
    }
    if (this.selectedTool.kind === "weapon") {
      const target = this.entities.nearestCriminalTarget(this.camera.position, 14);
      if (target && this.entities.disarmNearest(this.camera.position)) {
        this.createBeam(target.position, "#f97316");
        this.say(`${this.selectedTool.label} worked. Target is ready!`);
        this.audio.play(this.selectedTool.id.includes("oven") ? "oven" : "blaster");
        this.missions.markDisarmed();
      } else {
        this.say(`No target in ${this.selectedTool.label} range.`);
        this.audio.play("blocked");
      }
      return;
    }
    if (this.selectedTool.kind === "handcuffs") {
      const cuffed = this.entities.cuffNearest(this.camera.position);
      if (cuffed) {
        this.say(`${this.selectedTool.label} done. Take the target to the finish zone.`);
        this.audio.play(this.theme.id === "pizza" ? "delivery" : "cuffs");
        this.missions.markCuffed(cuffed);
      } else {
        this.say("Go closer after using the action tool.");
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

  private startFirstMission(isPractice: boolean): void {
    const mission = this.theme.missions.find((candidate) => candidate.isPractice === isPractice) ?? this.theme.missions[0];
    if (mission) {
      this.startMission(mission.id);
    }
  }

  private startMission(id: string): void {
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
    if (this.activeVehicle) {
      const vehicle = this.activeVehicle;
      this.activeVehicle = null;
      this.camera.position.copyFrom(vehicle.mesh.position.add(new Vector3(2.6, 2.9, 0)));
      this.say(`Exited ${vehicle.definition.label}.`);
      return;
    }
    const vehicle = this.vehicles
      .map((candidate) => ({
        candidate,
        distance: Vector3.Distance(this.camera.position, candidate.mesh.position)
      }))
      .filter(({ distance }) => distance < 8)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (vehicle) {
      this.activeVehicle = vehicle;
      this.say(`Driving ${vehicle.definition.label}.`);
      this.audio.play("car");
    } else {
      this.say("Walk closer to a vehicle.");
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
    this.health = Math.max(25, this.health - Math.ceil(12 * dt));
    this.audio.play("damage");
    if (performance.now() > this.interactionMessageUntil) {
      const target = this.entities.nearestCriminalTarget(this.camera.position, 4.5);
      const away = target ? this.camera.position.subtract(target.position) : Vector3.Zero();
      away.y = 0;
      if (away.length() > 0.1) {
        away.normalize();
        this.camera.position.addInPlace(away.scale(0.45));
      }
      this.say("Careful. This is a kid-safe warning, not a defeat.");
    }
  }

  private respawn(): void {
    const spawn = this.theme.spawnScene.playerSpawn;
    this.health = 100;
    this.activeVehicle = null;
    this.verticalVelocity = 0;
    this.camera.position.set(spawn.x, spawn.y, spawn.z);
    this.camera.rotation.set(0, spawn.yaw, 0);
    this.say(`Back at ${this.theme.displayName} with all gear.`);
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
      selectedToolLabel: this.selectedTool.label,
      selectedToolIcon: this.selectedTool.icon,
      driving: Boolean(this.activeVehicle),
      muted: this.audio.muted,
      musicEnabled: this.audio.musicEnabled,
      missionActive: this.missions.isMissionActive()
    });
  }

  private getInteractionText(): string {
    if (performance.now() < this.interactionMessageUntil) {
      return this.interactionMessage;
    }
    const target = this.entities.nearestCriminalTarget(this.camera.position, 18);
    return this.interactions.describe(this.selectedTool, target, Boolean(this.activeVehicle), this.missions.isMissionActive());
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

  private createVehicle(definition: VehicleDefinition): Mesh {
    const dimensions =
      definition.kind === "bike"
        ? { width: 1.1, height: 0.7, depth: 3.2 }
        : definition.kind === "plane"
          ? { width: 3.4, height: 0.9, depth: 6.4 }
          : definition.kind === "tank"
            ? { width: 4.2, height: 1.35, depth: 5.4 }
            : { width: 3.4, height: 1.1, depth: 5.1 };
    const root = MeshBuilder.CreateBox(`vehicle-${definition.id}`, dimensions, this.scene);
    root.position.set(definition.x, definition.y, definition.z);
    root.rotation.y = definition.yaw;
    const bodyMaterial = new StandardMaterial(`vehicle-${definition.id}-body`, this.scene);
    bodyMaterial.diffuseColor = Color3.FromHexString(definition.color);
    root.material = bodyMaterial;

    const accentColor = definition.accentColor ?? "#f8fafc";
    const accentMaterial = new StandardMaterial(`vehicle-${definition.id}-accent`, this.scene);
    accentMaterial.diffuseColor = Color3.FromHexString(accentColor);

    if (definition.kind === "bike") {
      const bag = MeshBuilder.CreateBox(`vehicle-${definition.id}-bag`, { width: 1.2, height: 0.95, depth: 0.9 }, this.scene);
      bag.parent = root;
      bag.position.set(0, 0.8, -0.9);
      bag.material = accentMaterial;
      const handle = MeshBuilder.CreateBox(`vehicle-${definition.id}-handle`, { width: 1.6, height: 0.16, depth: 0.16 }, this.scene);
      handle.parent = root;
      handle.position.set(0, 0.85, 1.1);
      handle.material = accentMaterial;
      return root;
    }

    if (definition.kind === "plane") {
      const wing = MeshBuilder.CreateBox(`vehicle-${definition.id}-wing`, { width: 7.2, height: 0.16, depth: 1.2 }, this.scene);
      wing.parent = root;
      wing.position.y = 0.1;
      wing.material = accentMaterial;
      const tail = MeshBuilder.CreateBox(`vehicle-${definition.id}-tail`, { width: 1.8, height: 1.2, depth: 0.22 }, this.scene);
      tail.parent = root;
      tail.position.set(0, 0.8, -2.8);
      tail.material = accentMaterial;
      return root;
    }

    const cabin = MeshBuilder.CreateBox(`vehicle-${definition.id}-cabin`, { width: 2.5, height: 1, depth: 2.2 }, this.scene);
    cabin.parent = root;
    cabin.position.y = 0.95;
    cabin.material = accentMaterial;

    if (definition.kind === "tank") {
      const turret = MeshBuilder.CreateBox(`vehicle-${definition.id}-turret`, { width: 1.8, height: 0.7, depth: 1.8 }, this.scene);
      turret.parent = root;
      turret.position.y = 1.55;
      turret.material = accentMaterial;
      const barrel = MeshBuilder.CreateBox(`vehicle-${definition.id}-barrel`, { width: 0.35, height: 0.35, depth: 3.1 }, this.scene);
      barrel.parent = root;
      barrel.position.set(0, 1.6, 2.1);
      barrel.material = accentMaterial;
    } else {
      const light = MeshBuilder.CreateBox(`vehicle-${definition.id}-light`, { width: 1.3, height: 0.22, depth: 0.36 }, this.scene);
      light.parent = root;
      light.position.y = 1.58;
      light.material = accentMaterial;
    }
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
