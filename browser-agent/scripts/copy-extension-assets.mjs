import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const sourceDir = path.join(root, "extension");
const targetDir = path.join(root, "dist", "extension");

await mkdir(targetDir, { recursive: true });

await cp(sourceDir, targetDir, {
  recursive: true,
  filter: (itemPath) => {
    if (itemPath.endsWith(".ts")) return false;
    return true;
  }
});

console.log("Copied extension static assets to dist/extension");
