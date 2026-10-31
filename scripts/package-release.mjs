import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, "dist");
const archive = resolve(dist, `${packageJson.name}-v${packageJson.version}.zip`);
mkdirSync(dist, { recursive: true });
rmSync(archive, { force: true });

const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
if (status.status !== 0) throw new Error("Git is required to create the release archive.");
if (status.stdout.trim()) throw new Error("Refusing to package a dirty working tree. Commit or stash changes first.");

const result = spawnSync("git", ["archive", "--format=zip", `--prefix=${packageJson.name}-v${packageJson.version}/`, "-o", archive, "HEAD"], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(archive);
