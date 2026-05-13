import { GameApp } from "./game/GameApp";
import { policeTheme } from "./themes/police";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const uiRoot = document.querySelector<HTMLDivElement>("#ui-root");

if (!canvas || !uiRoot) {
  throw new Error("Police and Crimes could not find its canvas or UI root.");
}

const app = new GameApp(canvas, uiRoot, policeTheme);
app.start();

window.addEventListener("beforeunload", () => app.dispose());
