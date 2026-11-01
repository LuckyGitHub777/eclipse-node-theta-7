import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const read = (path) => readFileSync(resolve(root, path), "utf8");
const required = [
  "README.md", "LICENSE", "SECURITY.md", "CHANGELOG.md", "requirements-browser.txt",
  "site/index.html", "site/404.html", "site/.nojekyll", "site/manifest.webmanifest",
  "site/assets/css/styles.css", "site/assets/js/app.js", "site/assets/img/theta7-sigil.svg",
  ".github/workflows/ci.yml", ".github/workflows/pages.yml"
];

const packageJson = JSON.parse(read("package.json"));
const html = read("site/index.html");
const notFound = read("site/404.html");
const css = read("site/assets/css/styles.css");
const js = read("site/assets/js/app.js");

function localReferences(markup) {
  return [...markup.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("#") && !value.startsWith("mailto:") && !value.startsWith("data:") && !value.startsWith("/"));
}

function visibleWordCount(markup) {
  const cleaned = markup
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.split(" ").length : 0;
}

test("required repository files exist", () => {
  for (const path of required) assert.ok(existsSync(resolve(root, path)), `Missing ${path}`);
});

test("version identity is consistent", () => {
  assert.equal(packageJson.version, "1.2.3");
  assert.match(html, /<small>v1\\.2\\.3<\/small>/);
  assert.match(js, /const VERSION = "1\\.2\\.3"/);
  assert.match(read("CHANGELOG.md"), /## \[1\\.2\\.3\]/);
});

test("JavaScript syntax passes", () => {
  const result = spawnSync(process.execPath, ["--check", resolve(root, "site/assets/js/app.js")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("all local site references resolve", () => {
  for (const reference of localReferences(html)) {
    assert.ok(!reference.startsWith(".."), `Reference escapes deploy root: ${reference}`);
    assert.ok(existsSync(resolve(root, "site", reference)), `Unresolved reference: ${reference}`);
  }
});

test("site has no remote runtime resources or network APIs", () => {
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(css, /https?:\/\//i);
  const withoutSvgNamespace = js.replace("http://www.w3.org/2000/svg", "");
  assert.doesNotMatch(withoutSvgNamespace, /https?:\/\//i);
  assert.doesNotMatch(js, /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
});

test("public interface is concise and free of internal project-history language", () => {
  const words = visibleWordCount(html);
  assert.ok(words >= 220, `Public page may be incomplete: ${words} words`);
  assert.ok(words <= 380, `Public page is too verbose: ${words} words`);
  assert.doesNotMatch(html, /release status|project history|internal note/i);
});

test("privacy and use boundaries remain visible and concise", () => {
  assert.match(html, /Creative reflection only\. No external signal is detected\./i);
  assert.match(html, /On GitHub Pages, reflections stay in this tab only/i);
  assert.match(js, /SHARED_PAGES_ORIGIN = window.location.hostname.toLowerCase\(\).endsWith\("\\.github\\.io"\)/);
  assert.match(js, /TAB_ONLY_MODE = FILE_MODE \\|\\| SHARED_PAGES_ORIGIN/);
  assert.match(html, /does not verify paranormal, extraterrestrial, medical, or intelligence claims/i);
  assert.match(html, /Downloaded copies work offline/i);
  assert.doesNotMatch(html, /No network connection|No network requests|offline-first/i);
});

test("three modes and seven questions are defined", () => {
  assert.equal((html.match(/data-mode=/g) || []).length, 3);
  assert.equal((html.match(/class="question-grid"[\s\S]*?<\/ol>/)?.[0].match(/<li>/g) || []).length, 7);
  const questionBlock = js.match(/const QUESTIONS = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1] || "";
  assert.equal((questionBlock.match(/^\s*"/gm) || []).length, 7);
  assert.match(js, /Array\.from\(\{ length: 7 \}/);
});

test("mode controls use plain pressed buttons rather than tab semantics", () => {
  assert.match(html, /data-mode="observe" aria-pressed="true"/);
  assert.doesNotMatch(html, /role="tablist"|role="tab"|aria-selected=/);
  assert.doesNotMatch(html, /id="helpBtn"|Begin Session|Ground &amp; Reset/);
});

test("mobile structure places controls before the stage", () => {
  assert.ok(html.indexOf('class="card controls"') < html.indexOf('class="stage card"'));
  assert.match(css, /grid-template-areas:\s*"controls"\s*"stage"/);
});

test("accessibility landmarks and target sizing are present", () => {
  assert.match(html, /class="skip-link"/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /prefers-reduced-motion/);
});

test("document identifiers and internal references are consistent", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate HTML id found");
  const idSet = new Set(ids);
  for (const target of [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1])) {
    assert.ok(idSet.has(target), `Missing fragment target: ${target}`);
  }
  for (const button of html.match(/<button\b[^>]*>/g) || []) assert.match(button, /type="button"/);
  for (const image of html.match(/<img\b[^>]*>/g) || []) assert.match(image, /alt="[^"]*"/);
});

test("web manifest and 404 experience are valid", () => {
  const manifest = JSON.parse(read("site/manifest.webmanifest"));
  assert.equal(manifest.name, "Eclipse Node Theta-7");
  assert.equal(manifest.start_url, "./");
  for (const icon of manifest.icons) assert.ok(existsSync(resolve(root, "site", icon.src)), `Missing manifest icon: ${icon.src}`);
  assert.match(notFound, /Page not found\./);
  assert.match(notFound, /id="homeLink"/);
});

test("breathing and audio safeguards are present", () => {
  assert.match(js, /label: "Inhale", seconds: 4/);
  assert.match(js, /label: "Hold gently", seconds: 2/);
  assert.match(js, /label: "Exhale", seconds: 6/);
  assert.match(html, /Breathe normally if uncomfortable\./);
  assert.match(js, /stopAllAudio\(\)/);
  assert.equal((js.match(/2390|2\.39-second/g) || []).length, 0, "The artistic pulse must not drive user instructions or timing logic");
});

test("workflow permissions and action references are controlled", () => {
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /permissions:\s*\n\s+contents: read/);
  assert.match(ci, /npm run test:browser/);
  assert.match(ci, /requirements-browser\.txt/);
  assert.match(ci, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(ci, /actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e/);
  const pages = read(".github/workflows/pages.yml");
  assert.match(pages, /workflow_run:/);
  assert.match(pages, /workflows: \["Continuous Integration"\]/);
  assert.match(pages, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(pages, /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/);
  assert.match(pages, /github\.event_name == 'workflow_dispatch'[\s\S]*github\.ref == 'refs\/heads\/main'/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.match(pages, /path: site/);
  assert.match(pages, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(pages, /actions\/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d/);
  assert.match(pages, /actions\/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9/);
  assert.match(pages, /actions\/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346/);
  assert.doesNotMatch(pages, /enablement:\s*true/);
});

test("repository ownership metadata matches the destination", () => {
  assert.match(read("LICENSE"), /Copyright \(c\) 2026 LuckyGitHub777/);
});
