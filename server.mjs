import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const port = Number(process.env.PORT || 3000);
const rootDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(rootDir, "data");
const databasePath = join(dataDir, "leaderboard.sqlite");

mkdirSync(dataDir, { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 30),
    score INTEGER NOT NULL
  )
`);

const seedCount = database.prepare("SELECT COUNT(*) AS count FROM players").get().count;
if (seedCount === 0) {
  const insert = database.prepare("INSERT INTO players (name, score) VALUES (?, ?)");
  for (const player of [
    ["Gamer123", 45],
    ["Wallsbreaker543", 567],
    ["allisnotwell", 435],
  ]) {
    insert.run(...player);
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) reject(new Error("Request body is too large"));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function getScores(limit) {
  const query = limit
    ? "SELECT id, name, score FROM players ORDER BY score DESC, id ASC LIMIT ?"
    : "SELECT id, name, score FROM players ORDER BY score DESC, id ASC";
  return (limit ? database.prepare(query).all(limit) : database.prepare(query).all());
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, null);
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  try {
    if (request.method === "GET" && url.pathname === "/scores") {
      const requestedLimit = Number(url.searchParams.get("top"));
      const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : null;
      sendJson(response, 200, getScores(limit));
      return;
    }

    if (request.method === "POST" && url.pathname === "/scores") {
      const payload = await readJson(request);
      const name = typeof payload.name === "string" ? payload.name.trim() : "";
      const score = Number(payload.score);
      if (!name || name.length > 30 || !Number.isInteger(score)) {
        sendJson(response, 400, { error: "name must be 1-30 characters and score must be an integer" });
        return;
      }
      const result = database
        .prepare("INSERT INTO players (name, score) VALUES (?, ?)")
        .run(name, score);
      const player = database
        .prepare("SELECT id, name, score FROM players WHERE id = ?")
        .get(Number(result.lastInsertRowid));
      sendJson(response, 201, player);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  }
});

server.listen(port, () => {
  console.log(`Leaderboard API running at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  database.close();
  server.close(() => process.exit(0));
});
