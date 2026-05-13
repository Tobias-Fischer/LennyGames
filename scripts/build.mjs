import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const outDir = "dist";
const docsDir = "docs";

await rm(outDir, { recursive: true, force: true });
await mkdir(`${outDir}/assets`, { recursive: true });

const result = await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outdir: outDir,
  entryNames: "assets/[name]-[hash]",
  format: "esm",
  target: ["es2020"],
  sourcemap: false,
  minify: true,
  metafile: true,
  loader: {
    ".css": "css"
  },
  logLevel: "info"
});

const jsOutput = Object.entries(result.metafile.outputs).find(
  ([path, meta]) => meta.entryPoint === "src/main.ts" && path.endsWith(".js")
);
if (!jsOutput) {
  throw new Error("Build did not produce a JavaScript entry output.");
}
const jsPath = `./${jsOutput[0].replace(`${outDir}/`, "")}`;
const cssBundle = jsOutput[1].cssBundle;
const cssPath = cssBundle ? `./${cssBundle.replace(`${outDir}/`, "")}` : null;

const sourceHtml = await readFile("index.html", "utf8");
const cssLink = cssPath
  ? `    <link rel="stylesheet" href="${cssPath}" />\n`
  : "";
const html = sourceHtml
  .replace(
    /    <script type="module" data-entry="game">[\s\S]*?<\/script>/,
    `${cssLink}    <script type="module" src="${jsPath}"></script>`
  )
  .replace('content="/', 'content="./');

await writeFile(`${outDir}/index.html`, html);
await copyFile("package.json", `${outDir}/package-meta.json`);
await writeFile(`${outDir}/.nojekyll`, "");

await rm(docsDir, { recursive: true, force: true });
await cp(outDir, docsDir, { recursive: true });
