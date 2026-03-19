import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const sourceDir = path.join(root, "extension");
const distDir = path.join(root, "dist");
const targetDir = path.join(distDir, "extension");
const runtimeDirs = ["agent", "config", "utils"];
const importRewrites = new Map([
  [
    path.join(targetDir, "background.js"),
    [
      ["../agent/", "./agent/"],
      ["../config/", "./config/"]
    ]
  ],
  [path.join(targetDir, "popup.js"), [["../utils/", "./utils/"]]],
  [
    path.join(targetDir, "content.js"),
    [
      ["../agent/", "./agent/"],
      ["../config/", "./config/"]
    ]
  ]
]);

await mkdir(targetDir, { recursive: true });

await cp(sourceDir, targetDir, {
  recursive: true,
  filter: (itemPath) => !itemPath.endsWith(".ts")
});

for (const dir of runtimeDirs) {
  await cp(path.join(distDir, dir), path.join(targetDir, dir), { recursive: true });
}

for (const [filePath, replacements] of importRewrites) {
  let content = await readFile(filePath, "utf8");
  for (const [from, to] of replacements) {
    content = content.replaceAll(from, to);
  }
  await writeFile(filePath, content, "utf8");
}

console.log("Copied extension assets and runtime modules to dist/extension");
