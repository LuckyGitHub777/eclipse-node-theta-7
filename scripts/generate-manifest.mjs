import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const excluded = new Set(["MANIFEST.sha256"]);
const ignoredParts = new Set([".git", "node_modules", "dist", "__pycache__"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredParts.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (!excluded.has(relative(root, path).replaceAll("\\", "/"))) files.push(path);
  }
  return files;
}

const lines = [];
for (const file of (await walk(root)).sort()) {
  const digest = createHash("sha256").update(await readFile(file)).digest("hex");
  lines.push(`${digest}  ${relative(root, file).replaceAll("\\", "/")}`);
}
await writeFile(resolve(root, "MANIFEST.sha256"), `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${lines.length} hashes to MANIFEST.sha256`);
