import type { HudState, ToolDefinition } from "./types";

export interface HudActions {
  selectTool(toolId: string): void;
  useTool(): void;
  jump(): void;
  enterVehicle(): void;
  toggleMute(): void;
  toggleMusic(): void;
  toggleAutoWalk(): void;
  turnLeft(): void;
  turnRight(): void;
  startPractice(): void;
  startActual(): void;
  changeWorld(): void;
  resetWorld(): void;
  qaTeleport(): void;
  qaStep(): void;
}

export class Hud {
  readonly root: HTMLDivElement;

  private readonly missionTitle: HTMLDivElement;
  private readonly missionText: HTMLDivElement;
  private readonly health: HTMLDivElement;
  private readonly alarm: HTMLDivElement;
  private readonly interaction: HTMLDivElement;
  private readonly selectedTool: HTMLDivElement;
  private readonly objectiveCompass: HTMLDivElement;
  private readonly objectiveArrow: HTMLDivElement;
  private readonly objectiveText: HTMLDivElement;
  private readonly badgesPanel: HTMLDivElement;
  private readonly badgesButton: HTMLButtonElement;
  private readonly mute: HTMLButtonElement;
  private readonly music: HTMLButtonElement;
  private readonly drive: HTMLButtonElement;
  private readonly walk: HTMLButtonElement;
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
    this.objectiveCompass = document.createElement("div");
    this.objectiveCompass.className = "objective-compass";
    this.objectiveArrow = document.createElement("div");
    this.objectiveArrow.className = "objective-arrow";
    this.objectiveText = document.createElement("div");
    this.objectiveText.className = "objective-text";
    this.objectiveCompass.append(this.objectiveArrow, this.objectiveText);

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
    this.badgesButton = this.makeActionButton("Badges", () => {
      this.badgesPanel.classList.toggle("open");
    });
    rightActions.append(use, jump, this.drive, this.mute, this.music, this.badgesButton);
    this.badgesPanel = document.createElement("div");
    this.badgesPanel.className = "badges-panel";

    const smallControls = document.createElement("div");
    smallControls.className = "small-controls";
    smallControls.append(
      this.makeSmallButton("Practice", actions.startPractice),
      this.makeSmallButton("Actual", actions.startActual),
      this.makeSmallButton("World", actions.changeWorld),
      this.makeSmallButton("Reset", actions.resetWorld)
    );

    const qaControls = document.createElement("div");
    qaControls.className = "qa-controls";
    qaControls.append(this.makeSmallButton("QA Go", actions.qaTeleport), this.makeSmallButton("QA Step", actions.qaStep));

    const movementControls = document.createElement("div");
    movementControls.className = "movement-controls";
    const turnLeft = this.makeSmallButton("Turn L", actions.turnLeft);
    this.walk = this.makeSmallButton("Walk", actions.toggleAutoWalk);
    const turnRight = this.makeSmallButton("Turn R", actions.turnRight);
    movementControls.append(turnLeft, this.walk, turnRight);

    const desktopHint = document.createElement("div");
    desktopHint.className = "desktop-hint";
    desktopHint.textContent = "Desktop: WASD move, drag or click to look, E use, F ride, Space jump.";

    this.root.append(
      topBar,
      crosshair,
      this.interaction,
      this.selectedTool,
      this.objectiveCompass,
      this.badgesPanel,
      hotbar,
      rightActions,
      smallControls,
      movementControls,
      qaControls,
      desktopHint
    );
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
    this.walk.textContent = state.autoWalk ? "Stop" : "Walk";
    this.walk.classList.toggle("selected", state.autoWalk);
    this.objectiveCompass.classList.toggle("visible", state.objectiveDistance !== null && state.objectiveBearing !== null);
    this.objectiveArrow.style.transform = `rotate(${state.objectiveBearing ?? 0}rad)`;
    this.objectiveText.textContent =
      state.objectiveDistance === null ? "" : `${state.objectiveLabel}: ${Math.round(state.objectiveDistance)}m`;
    this.badgesButton.textContent = `Stars ${state.stars}`;
    const badges = state.badges.length > 0 ? state.badges.join(", ") : "No badges yet";
    const unlocks = state.unlockedDecorations.length > 0 ? state.unlockedDecorations.join(", ") : "No unlocks yet";
    this.badgesPanel.textContent = `Stars: ${state.stars} | Badges: ${badges} | Unlocks: ${unlocks}`;
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
