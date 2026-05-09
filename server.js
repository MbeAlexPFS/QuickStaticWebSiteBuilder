const http = require("http");
const fs = require("fs");
const path = require("path");

const hostname = "127.0.0.1";
const port = 3000;
const DATA_DIR = path.join(__dirname, "data");
const PID_FILE = path.join(__dirname, ".server.pid");

function writePidFile() {
  try { fs.writeFileSync(PID_FILE, String(process.pid), "utf8"); } catch (_) {}
}
function removePidFile() {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch (_) {}
}
function readPidFile() {
  try { return parseInt(fs.readFileSync(PID_FILE, "utf8"), 10); } catch (_) { return null; }
}
function killOldServer() {
  const oldPid = readPidFile();
  if (oldPid && oldPid !== process.pid) {
    try {
      process.kill(oldPid, "SIGTERM");
      console.log(`Ancien serveur (PID ${oldPid}) arrêté`);
      return true;
    } catch (_) { return false; }
  }
  return false;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function dataFilePath(type) {
  const map = { components: "components.json", sites: "sites.json", libs: "libs.json" };
  return path.join(DATA_DIR, map[type] || `${type}.json`);
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

function writeJSON(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function sendJSON(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function sendError(res, msg, status = 500) {
  res.statusCode = status;
  res.end(msg);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => body += c.toString());
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
  });
}

function duplicateFolder(srcPath, destPath) {
  if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
  for (const item of fs.readdirSync(srcPath)) {
    const s = path.join(srcPath, item);
    const d = path.join(destPath, item);
    if (fs.lstatSync(s).isDirectory()) duplicateFolder(s, d);
    else fs.copyFileSync(s, d);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.end(); return; }

  const url = new URL(req.url, `http://${hostname}`);
  const pathname = url.pathname;

  // ── API: Data CRUD ──────────────────────────────────────────
  const dataMatch = pathname.match(/^\/api\/data\/(components|sites|libs)$/);
  if (dataMatch) {
    const type = dataMatch[1];
    const filePath = dataFilePath(type);

    if (req.method === "GET") {
      const data = readJSON(filePath);
      return sendJSON(res, data || {});
    }
    if (req.method === "PUT") {
      try {
        const body = await parseBody(req);
        writeJSON(filePath, body);
        return sendJSON(res, { ok: true });
      } catch (e) { return sendError(res, e.message); }
    }
    if (req.method === "DELETE") {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return sendJSON(res, { ok: true });
    }
  }

  // ── API: Reset all data ─────────────────────────────────────
  if (pathname === "/api/data" && req.method === "DELETE") {
    if (fs.existsSync(DATA_DIR)) fs.rmSync(DATA_DIR, { recursive: true, force: true });
    return sendJSON(res, { ok: true, message: "Toutes les données ont été supprimées" });
  }

  // ── API: Export .qswb ────────────────────────────────────────
  if (pathname === "/api/export" && req.method === "GET") {
    ensureDataDir();
    const qswb = {
      format: "qswb",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        components: readJSON(dataFilePath("components")) || {},
        sites: readJSON(dataFilePath("sites")) || {},
        libraries: readJSON(dataFilePath("libs")) || {},
      }
    };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="export-${Date.now()}.qswb"`);
    return res.end(JSON.stringify(qswb, null, 2));
  }

  // ── API: Import .qswb ────────────────────────────────────────
  if (pathname === "/api/import" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      if (body.format !== "qswb") return sendError(res, "Format invalide", 400);
      const d = body.data;
      if (d.components) writeJSON(dataFilePath("components"), d.components);
      if (d.sites) writeJSON(dataFilePath("sites"), d.sites);
      if (d.libraries) writeJSON(dataFilePath("libs"), d.libraries);
      return sendJSON(res, { ok: true, message: "Import réussi" });
    } catch (e) { return sendError(res, e.message); }
  }

  // ── API: Project data.json ──────────────────────────────────
  if (pathname === "/api/project/save" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const siteName = body.site_name;
      if (!siteName) return sendError(res, "site_name manquant", 400);
      const projectDir = path.join(__dirname, "project", siteName);
      fs.mkdirSync(path.join(projectDir, "ressources"), { recursive: true });
      fs.mkdirSync(path.join(projectDir, "build"), { recursive: true });
      writeJSON(path.join(projectDir, "data.json"), body.data || {});
      return sendJSON(res, { ok: true });
    } catch (e) { return sendError(res, e.message); }
  }

  // ── API: Upload media to project ────────────────────────────
  if (pathname === "/api/project/upload" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const siteName = body.site_name;
      if (!siteName) return sendError(res, "site_name manquant", 400);
      if (!body.filename) return sendError(res, "filename manquant", 400);
      const ressourceDir = path.join(__dirname, "project", siteName, "ressources");
      if (!fs.existsSync(ressourceDir)) fs.mkdirSync(ressourceDir, { recursive: true });

      let finalName = String(body.filename);
      const dotIdx = finalName.lastIndexOf('.');
      const namePart = dotIdx > 0 ? finalName.slice(0, dotIdx) : finalName;
      const extPart = dotIdx > 0 ? finalName.slice(dotIdx) : '';
      let counter = 0;
      while (fs.existsSync(path.join(ressourceDir, finalName))) {
        counter++;
        finalName = `${namePart}(${counter})${extPart}`;
      }

      const filePath = path.join(ressourceDir, finalName);
      const raw = Buffer.from(body.content, "base64");
      fs.writeFileSync(filePath, raw);
      return sendJSON(res, { ok: true, url: `/project/${siteName}/ressources/${finalName}`, finalName });
    } catch (e) { return sendError(res, e.message); }
  }

  // ── API: Rename media in project ────────────────────────────
  if (pathname === "/api/project/rename" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const siteName = body.site_name;
      const oldName = body.old_name;
      const newName = body.new_name;
      if (!siteName || !oldName || !newName) return sendError(res, "Paramètres manquants", 400);
      const ressourceDir = path.join(__dirname, "project", siteName, "ressources");
      const oldPath = path.join(ressourceDir, oldName);
      if (!fs.existsSync(oldPath)) return sendError(res, "Fichier introuvable", 404);
      let finalNewName = String(newName);
      const dotIdx = finalNewName.lastIndexOf('.');
      const namePart = dotIdx > 0 ? finalNewName.slice(0, dotIdx) : finalNewName;
      const extPart = dotIdx > 0 ? finalNewName.slice(dotIdx) : '';
      let counter = 0;
      while (fs.existsSync(path.join(ressourceDir, finalNewName))) {
        counter++;
        finalNewName = `${namePart}(${counter})${extPart}`;
      }
      fs.renameSync(oldPath, path.join(ressourceDir, finalNewName));
      return sendJSON(res, { ok: true, url: `/project/${siteName}/ressources/${finalNewName}`, finalName: finalNewName });
    } catch (e) { return sendError(res, e.message); }
  }

  // ── API: List media for a project ──────────────────────────
  const listMatch = pathname.match(/^\/api\/project\/ressources\/(.+)$/);
  if (listMatch && req.method === "GET") {
    const siteName = decodeURIComponent(listMatch[1]);
    const dir = path.join(__dirname, "project", siteName, "ressources");
    if (!fs.existsSync(dir)) return sendJSON(res, []);
    const files = fs.readdirSync(dir).filter(f => fs.lstatSync(path.join(dir, f)).isFile());
    return sendJSON(res, files.map(f => ({
      name: f,
      url: `/project/${siteName}/ressources/${f}`,
      size: fs.statSync(path.join(dir, f)).size,
    })));
  }

  // ── API: Delete media from project ──────────────────────────
  const delMatch = pathname.match(/^\/api\/project\/ressource\/(.+?)\/(.+)$/);
  if (delMatch && req.method === "DELETE") {
    const siteName = decodeURIComponent(delMatch[1]);
    const fileName = decodeURIComponent(delMatch[2]);
    const filePath = path.join(__dirname, "project", siteName, "ressources", fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return sendJSON(res, { ok: true });
  }

  // ── API: Save site build (existing) ──────────────────────────
  if (req.method === "POST" && pathname === "/api/save") {
    try {
      const data = await parseBody(req);
      const siteDir = path.join(__dirname, "project", data.site_name);

      if (data.action === "clear") {
        const targetDir = data.path ? path.join(siteDir, data.path) : siteDir;
        if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
        fs.mkdirSync(targetDir, { recursive: true });
        return res.end("Dossier vidé");
      } else if (data.action === "save_file") {
        const filePath = path.join(siteDir, data.file_path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, data.content);
        return res.end("Fichier sauvé");
      }
      return sendError(res, "Action inconnue", 400);
    } catch (err) { return sendError(res, "Erreur serveur: " + err.message); }
  }

  // ── Serve static files ───────────────────────────────────────
  // Allow access to project/ for media files
  if (pathname.startsWith("/project/")) {
    const projectFilePath = path.join(__dirname, decodeURIComponent(pathname));
    if (fs.existsSync(projectFilePath) && fs.lstatSync(projectFilePath).isFile()) {
      const ext = path.extname(projectFilePath).toLowerCase();
      const mime = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm", ".zip": "application/zip" };
      res.statusCode = 200;
      res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
      return fs.createReadStream(projectFilePath).pipe(res);
    }
    return sendError(res, "Fichier introuvable", 404);
  }

  let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
  fs.stat(filePath, (err) => {
    if (err) { res.statusCode = 404; return res.end("404 Not Found"); }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.statusCode = 500; return res.end("500 Internal Server Error"); }
      let contentType = "text/plain";
      if (filePath.endsWith(".html")) contentType = "text/html";
      else if (filePath.endsWith(".css")) contentType = "text/css";
      else if (filePath.endsWith(".js")) contentType = "application/javascript";
      else if (filePath.endsWith(".json")) contentType = "application/json";
      res.statusCode = 200;
      res.setHeader("Content-Type", contentType);
      res.end(data);
    });
  });
});

function startServer() {
  server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
    ensureDataDir();
    writePidFile();
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} déjà utilisé.`);
      if (killOldServer()) {
        setTimeout(startServer, 500);
      } else {
        console.error(`Impossible de libérer le port ${port}.`);
        console.error("Utilisez cette commande pour arrêter l'ancien processus :");
        console.error("  Get-Process -Name node | Stop-Process -Force");
        process.exit(1);
      }
    } else {
      console.error("Erreur serveur:", err);
      process.exit(1);
    }
  });
}

process.on("exit", removePidFile);
process.on("SIGINT", () => { removePidFile(); process.exit(0); });
process.on("SIGTERM", () => { removePidFile(); process.exit(0); });

killOldServer();
startServer();
