import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = new URL("../site/", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8" };

const server = http.createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const safe = normalize(relative).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = join(root, safe);
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(join(root, "404.html")).pipe(response);
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Theta-7 available at http://127.0.0.1:${port}`));
