import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";

interface PointerTracker {
  id: number;
  startX: number;
  startY: number;
}

export class InputController {
  readonly root: HTMLDivElement;

  moveX = 0;
  moveZ = 0;
  lookX = 0;
  lookY = 0;
  jumpPressed = false;
  usePressed = false;
  enterPressed = false;

  private readonly keys = new Set<string>();
  private readonly joystick: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private joystickPointer: PointerTracker | null = null;
  private lookPointerId: number | null = null;
  private lastLookX = 0;
  private lastLookY = 0;
  private readonly cleanups: Array<() => void> = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.root = document.createElement("div");
    this.root.className = "input-layer";

    this.joystick = document.createElement("div");
    this.joystick.className = "joystick";
    this.knob = document.createElement("div");
    this.knob.className = "joystick-knob";
    this.joystick.append(this.knob);
    this.root.append(this.joystick);

    this.bindKeyboard();
    this.bindJoystick();
    this.bindLookDrag();
  }

  updateCameraLook(camera: FreeCamera, dt: number): void {
    camera.rotation.y += this.lookX * dt * 2.8;
    camera.rotation.x += this.lookY * dt * 2.25;
    camera.rotation.x = Math.max(-1.2, Math.min(1.05, camera.rotation.x));
    this.lookX *= 0.8;
    this.lookY *= 0.8;
  }

  consumeUse(): boolean {
    const used = this.usePressed;
    this.usePressed = false;
    return used;
  }

  consumeEnter(): boolean {
    const entered = this.enterPressed;
    this.enterPressed = false;
    return entered;
  }

  dispose(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.root.remove();
  }

  private bindKeyboard(): void {
    const keyDown = (event: KeyboardEvent) => {
      this.keys.add(event.code);
      if (event.code === "Space") {
        this.jumpPressed = true;
      }
      if (event.code === "KeyE") {
        this.usePressed = true;
      }
      if (event.code === "KeyF") {
        this.enterPressed = true;
      }
      this.updateKeyboardVector();
    };
    const keyUp = (event: KeyboardEvent) => {
      this.keys.delete(event.code);
      if (event.code === "Space") {
        this.jumpPressed = false;
      }
      this.updateKeyboardVector();
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    this.cleanups.push(() => window.removeEventListener("keydown", keyDown));
    this.cleanups.push(() => window.removeEventListener("keyup", keyUp));
  }

  private updateKeyboardVector(): void {
    const keyboardX = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const keyboardZ = Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));

    if (keyboardX !== 0 || keyboardZ !== 0 || !this.joystickPointer) {
      this.moveX = keyboardX;
      this.moveZ = keyboardZ;
    }
  }

  private bindJoystick(): void {
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      this.joystick.setPointerCapture(event.pointerId);
      const rect = this.joystick.getBoundingClientRect();
      this.joystickPointer = {
        id: event.pointerId,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2
      };
      this.updateJoystick(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (this.joystickPointer?.id !== event.pointerId) {
        return;
      }
      event.preventDefault();
      this.updateJoystick(event.clientX, event.clientY);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (this.joystickPointer?.id !== event.pointerId) {
        return;
      }
      this.joystickPointer = null;
      this.moveX = 0;
      this.moveZ = 0;
      this.knob.style.transform = "translate(-50%, -50%)";
    };

    this.joystick.addEventListener("pointerdown", onPointerDown);
    this.joystick.addEventListener("pointermove", onPointerMove);
    this.joystick.addEventListener("pointerup", onPointerUp);
    this.joystick.addEventListener("pointercancel", onPointerUp);
    this.cleanups.push(() => this.joystick.removeEventListener("pointerdown", onPointerDown));
    this.cleanups.push(() => this.joystick.removeEventListener("pointermove", onPointerMove));
    this.cleanups.push(() => this.joystick.removeEventListener("pointerup", onPointerUp));
    this.cleanups.push(() => this.joystick.removeEventListener("pointercancel", onPointerUp));
  }

  private updateJoystick(clientX: number, clientY: number): void {
    if (!this.joystickPointer) {
      return;
    }
    const max = 54;
    const dx = clientX - this.joystickPointer.startX;
    const dy = clientY - this.joystickPointer.startY;
    const length = Math.hypot(dx, dy);
    const scale = length > max ? max / length : 1;
    const knobX = dx * scale;
    const knobY = dy * scale;

    this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    this.moveX = knobX / max;
    this.moveZ = -knobY / max;
  }

  private bindLookDrag(): void {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target !== this.canvas || event.clientX < window.innerWidth * 0.28) {
        return;
      }
      event.preventDefault();
      this.lookPointerId = event.pointerId;
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
      this.canvas.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (this.lookPointerId !== event.pointerId) {
        return;
      }
      const dx = event.clientX - this.lastLookX;
      const dy = event.clientY - this.lastLookY;
      this.lastLookX = event.clientX;
      this.lastLookY = event.clientY;
      this.lookX = dx * 0.042;
      this.lookY = dy * 0.034;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (this.lookPointerId === event.pointerId) {
        this.lookPointerId = null;
      }
    };
    const onWheel = (event: WheelEvent) => {
      this.lookY += event.deltaY * 0.0008;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== this.canvas) {
        return;
      }
      this.lookX = event.movementX * 0.042;
      this.lookY = event.movementY * 0.034;
    };
    const onClick = () => {
      if (window.matchMedia("(pointer: fine)").matches) {
        void this.canvas.requestPointerLock?.();
      }
    };

    this.canvas.addEventListener("pointerdown", onPointerDown);
    this.canvas.addEventListener("pointermove", onPointerMove);
    this.canvas.addEventListener("pointerup", onPointerUp);
    this.canvas.addEventListener("pointercancel", onPointerUp);
    this.canvas.addEventListener("wheel", onWheel);
    this.canvas.addEventListener("click", onClick);
    window.addEventListener("mousemove", onMouseMove);
    this.cleanups.push(() => this.canvas.removeEventListener("pointerdown", onPointerDown));
    this.cleanups.push(() => this.canvas.removeEventListener("pointermove", onPointerMove));
    this.cleanups.push(() => this.canvas.removeEventListener("pointerup", onPointerUp));
    this.cleanups.push(() => this.canvas.removeEventListener("pointercancel", onPointerUp));
    this.cleanups.push(() => this.canvas.removeEventListener("wheel", onWheel));
    this.cleanups.push(() => this.canvas.removeEventListener("click", onClick));
    this.cleanups.push(() => window.removeEventListener("mousemove", onMouseMove));
  }
}
