import { GameApp } from "./game/GameApp";
import type { ThemePack } from "./game/types";
import { themes } from "./themes";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const uiRoot = document.querySelector<HTMLDivElement>("#ui-root");

if (!canvas || !uiRoot) {
  throw new Error("Police and Crimes could not find its canvas or UI root.");
}

const gameCanvas = canvas;
const gameUiRoot = uiRoot;
let app: GameApp | null = null;

const scenarioCopy: Record<string, string> = {
  police: "A denser police city with station, jail, shops, car, alarms, cuffs, taser, and blaster.",
  army: "A barracks campus with soldiers, training range, hangar, tank, truck, plane, and toy action tools.",
  pizza: "A fictional pizza delivery town with cooks, customers, orders, bikes, ovens, and delivery missions."
};

function clearUi(): void {
  gameUiRoot.innerHTML = "";
}

function launch(theme: ThemePack): void {
  app?.dispose();
  app = null;
  clearUi();
  gameCanvas.classList.remove("canvas-hidden");
  app = new GameApp(gameCanvas, gameUiRoot, theme, showScenarioPicker);
  app.start();
}

function showScenarioPicker(): void {
  app?.dispose();
  app = null;
  clearUi();
  gameCanvas.classList.add("canvas-hidden");

  const screen = document.createElement("div");
  screen.className = "scenario-screen";
  const title = document.createElement("div");
  title.className = "scenario-title";
  title.textContent = "Police and Crimes";
  const subtitle = document.createElement("div");
  subtitle.className = "scenario-subtitle";
  subtitle.textContent = "Choose a world to play.";
  const grid = document.createElement("div");
  grid.className = "scenario-grid";

  themes.forEach((theme) => {
    const card = document.createElement("button");
    card.className = `scenario-card scenario-${theme.id}`;
    card.type = "button";
    const name = document.createElement("span");
    name.className = "scenario-name";
    name.textContent = theme.displayName;
    const description = document.createElement("span");
    description.className = "scenario-description";
    description.textContent = scenarioCopy[theme.id] ?? "Build, explore, and play missions.";
    card.append(name, description);
    card.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      launch(theme);
    });
    grid.append(card);
  });

  screen.append(title, subtitle, grid);
  gameUiRoot.append(screen);
}

showScenarioPicker();

window.addEventListener("beforeunload", () => app?.dispose());
