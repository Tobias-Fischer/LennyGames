import type { HudState, ToolDefinition } from "./types";

export interface HudActions {
  selectTool(toolId: string): void;
  useTool(): void;
  jump(): void;
  enterVehicle(): void;
  toggleMute(): void;
  toggleMusic(): void;
  startPractice(): void;
  startActual(): void;
  changeWorld(): void;
  resetWorld(): void;
}

export class Hud {
  readonly root: HTMLDivElement;

  private readonly missionTitle: HTMLDivElement;
  private readonly missionText: HTMLDivElement;
  private readonly health: HTMLDivElement;
  private readonly alarm: HTMLDivElement;
  private readonly interaction: HTMLDivElement;
  private readonly selectedTool: HTMLDivElement;
  private readonly mute: HTMLButtonElement;
  private readonly music: HTMLButtonElement;
  private readonly drive: HTMLButtonElement;
  private readonly toolButtons = new Map<string, HTMLButtonElement>();

  constructor(tools: ToolDefinition[], actions: HudActions) {
    this.root = document.createElement("div");
    this.root.className = "hud";

    const topBar = document.createElement("div");
    topBar.className = "top-bar";

    const missionCard = document.createElement("div");
    missionCard.className = "mission-card";
    this.missionTitle = document.createElement("div");
    this.missionTitle.className = "mission-title";
    this.missionText = document.createElement("div");
    this.missionText.className = "mission-text";
    missionCard.append(this.missionTitle, this.missionText);

    const statusRow = document.createElement("div");
    statusRow.className = "status-row";
    this.health = document.createElement("div");
    this.health.className = "status-pill";
    this.alarm = document.createElement("div");
    this.alarm.className = "status-pill alarm";
    statusRow.append(this.health, this.alarm);
    topBar.append(missionCard, statusRow);

    const crosshair = document.createElement("div");
    crosshair.className = "crosshair";

    this.interaction = document.createElement("div");
    this.interaction.className = "interaction-prompt";
    this.selectedTool = document.createElement("div");
    this.selectedTool.className = "selected-tool";

    const hotbar = document.createElement("div");
    hotbar.className = "hotbar";
    tools.forEach((tool) => {
      const button = document.createElement("button");
      button.className = "tool-button";
      button.type = "button";
      button.title = tool.label;
      button.innerHTML = `<span class="tool-icon">${tool.icon}</span><span class="tool-label">${tool.label}</span>`;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        actions.selectTool(tool.id);
      });
      this.toolButtons.set(tool.id, button);
      hotbar.append(button);
    });

    const rightActions = document.createElement("div");
    rightActions.className = "right-actions";
    const use = this.makeActionButton("Use", actions.useTool);
    const jump = this.makeActionButton("Jump", actions.jump);
    this.drive = this.makeActionButton("Ride", actions.enterVehicle);
    this.mute = this.makeActionButton("Sound", actions.toggleMute);
    this.music = this.makeActionButton("Music", actions.toggleMusic);
    rightActions.append(use, jump, this.drive, this.mute, this.music);

    const smallControls = document.createElement("div");
    smallControls.className = "small-controls";
    smallControls.append(
      this.makeSmallButton("Practice", actions.startPractice),
      this.makeSmallButton("Actual", actions.startActual),
      this.makeSmallButton("World", actions.changeWorld),
      this.makeSmallButton("Reset", actions.resetWorld)
    );

    const desktopHint = document.createElement("div");
    desktopHint.className = "desktop-hint";
    desktopHint.textContent = "Desktop: WASD move, drag or click to look, E use, F ride, Space jump.";

    this.root.append(topBar, crosshair, this.interaction, this.selectedTool, hotbar, rightActions, smallControls, desktopHint);
  }

  update(state: HudState): void {
    this.health.textContent = `HP ${state.health}`;
    this.alarm.textContent = state.alarmActive ? "ALARM" : "READY";
    this.missionTitle.textContent = state.missionTitle;
    this.missionText.textContent = state.missionText;
    this.interaction.textContent = state.interactionText;
    this.selectedTool.textContent = `Tool: ${state.selectedToolIcon} ${state.selectedToolLabel}`;
    this.drive.textContent = state.driving ? "Exit" : "Ride";
    this.mute.textContent = state.muted ? "Muted" : "Sound";
    this.music.textContent = state.musicEnabled ? "Music On" : "Music";
    this.toolButtons.forEach((button, toolId) => {
      button.classList.toggle("selected", toolId === state.selectedToolId);
    });
  }

  dispose(): void {
    this.root.remove();
  }

  private makeActionButton(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "action-button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      action();
    });
    return button;
  }

  private makeSmallButton(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "small-button";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      action();
    });
    return button;
  }
}
