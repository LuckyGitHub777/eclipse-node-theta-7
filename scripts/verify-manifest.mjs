import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const manifest = await readFile(resolve(root, "MANIFEST.sha256"), "utf8");
let failures = 0;
for (const line of manifest.trim().split("\n")) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) { console.error(`Malformed manifest line: ${line}`); failures++; continue; }
  const [, expected, relative] = match;
  try {
    const actual = createHash("sha256").update(await readFile(resolve(root, relative))).digest("hex");
    if (actual !== expected) { console.error(`FAIL ${relative}`); failures++; }
    else console.log(`PASS ${relative}`);
  } catch (error) { console.error(`FAIL ${relative}: ${error.message}`); failures++; }
}
if (failures) process.exit(1);
