import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const outDir = "dist";
const docsDir = "docs";

await rm(outDir, { recursive: true, force: true });
await mkdir(`${outDir}/assets`, { recursive: true });

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: `${outDir}/assets/main.js`,
  format: "esm",
  target: ["es2020"],
  sourcemap: false,
  minify: true,
  packages: "external",
  loader: {
    ".css": "css"
  },
  logLevel: "info"
});

const sourceHtml = await readFile("index.html", "utf8");
const cssLink = existsSync(`${outDir}/assets/main.css`)
  ? '    <link rel="stylesheet" href="./assets/main.css" />\n'
  : "";
const html = sourceHtml
  .replace(
    /    <script type="module" data-entry="game">[\s\S]*?<\/script>/,
    `    <script type="importmap">
      {
        "imports": {
          "@babylonjs/core/": "https://cdn.jsdelivr.net/npm/@babylonjs/core@9.6.2/"
        }
      }
    </script>
${cssLink}    <script type="module" src="./assets/main.js"></script>`
  )
  .replace('content="/', 'content="./');

await writeFile(`${outDir}/index.html`, html);
await copyFile("package.json", `${outDir}/package-meta.json`);
await writeFile(`${outDir}/.nojekyll`, "");

await rm(docsDir, { recursive: true, force: true });
await cp(outDir, docsDir, { recursive: true });
