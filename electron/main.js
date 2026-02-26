// PURE DESKTOP: No backend, no JWT.
// Data stored locally in SQLite. Local videos stored under userData/videos.

import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from "electron";
import { join, basename, extname } from "path";
import { mkdirSync, createReadStream, existsSync, promises } from "fs";
import { randomBytes, createHash } from "crypto";
import { pathToFileURL } from "url";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { getDb } from "./db.js";

// ------------------------- Helpers -------------------------

function videosDir() {
    const dir = join(app.getPath("userData"), "videos");
    mkdirSync(dir, { recursive: true });
    return dir;
}

function makeId() {
    return randomBytes(16).toString("hex");
}

function isHttpUrl(str) {
    try {
        const u = new URL(str);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

// Stream-hash (does NOT load entire file into RAM)
function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = createHash("sha256");
        const stream = createReadStream(filePath);

        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(hash.digest("hex")));
    });
}

// Normalize DB video row for UI
function mapVideoRow(row) {
    if (!row) return null;

    let fileUrl = null;
    let missing = false;

    if (row.source_type === "local" && row.filename) {
        const localPath = join(videosDir(), row.filename);
        const exists = existsSync(localPath);
        missing = !exists;
        // fileUrl = exists ? pathToFileURL(localPath).href : null
        fileUrl = exists ? `video://local/${row.id}` : null;;
    }

    return {
        id: row.id,
        title: row.title,
        sourceType: row.source_type,
        filename: row.filename,
        contentHash: row.content_hash,
        externalUrl: row.external_url,
        provider: row.provider,
        createdAt: row.created_at,
        fileUrl,
        missing
    };
}

ipcMain.handle("api:health", async () => ({ ok: true, mode: "desktop-only" }));

// ------------------------- IPC: Videos -------------------------

// List videos (optional filters)
ipcMain.handle("videos:list", async (_event, args) => {
    const db = getDb();
    const type = args?.type; // "all" | "local" | "external"
    const q = (args?.q ?? "").trim();

    let rows;

    if (type && type !== "all") {
        if (q) {
            rows = db.prepare(`
                SELECT * FROM videos
                WHERE source_type = ?
                    AND title LIKE ?
                ORDER BY id DESC
            `).all(type, `%${q}%`);
        } else {
            rows = db.prepare(`
                SELECT * FROM videos
                WHERE source_type = ?
                ORDER BY id DESC
            `).all(type);
        }
    } else {
        if (q) {
            rows = db.prepare(`
                SELECT * FROM videos
                WHERE title LIKE ?
                ORDER BY id DESC
            `).all(`%${q}%`);
        } else {
            rows = db.prepare(`
                SELECT * FROM videos
                ORDER BY id DESC
            `).all();
        }
    }

    return { ok: true, items: rows.map(mapVideoRow) };
});

// Import local video file
ipcMain.handle("videos:import", async () => {
    const db = getDb();

    const pick = await dialog.showOpenDialog({
        title: "Import a video",
        properties: ["openFile"],
        filters: [
            { name: "Videos", extensions: ["mp4", "mov", "mkv", "webm", "avi"] },
            { name: "All Files", extensions: ["*"] }
        ]
    });

    if (pick.canceled || !pick.filePaths?.length) {
        return { ok: false, message: "Canceled" };
    }

    const src = pick.filePaths[0];
    const title = basename(src);
    const ext = extname(src);

    // 1) Compute content hash to detect duplicates
    const hash = await sha256File(src);

    // 2) If already exists, DO NOT copy/store again
    const existing = db.prepare(`
        SELECT * FROM videos
        WHERE content_hash = ?
        LIMIT 1
    `).get(hash);

    if (existing) {
        return {
            ok: true,
            deduped: true,
            item: mapVideoRow(existing)
        };
    }

    // 3) Copy into app storage with safe unique filename
    const filename = `${makeId()}${ext}`;
    const dest = join(videosDir(), filename);

    await promises.copyFile(src, dest);

    // 4) Insert into DB
    const info = db.prepare(`
        INSERT INTO videos (title, filename, content_hash, source_type)
        VALUES (?, ?, ?, 'local')
    `).run(title, filename, hash);

    const row = db.prepare(`SELECT * FROM videos WHERE id = ?`).get(info.lastInsertRowid);

    return { ok: true, deduped: false, item: mapVideoRow(row) };
});

protocol.registerSchemesAsPrivileged([
    {
        scheme: "video",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true
        }
    }
]);

// Add external link as a video
ipcMain.handle("videos:upload", async (_event, payload) => {
    const db = getDb();

    const title = (payload?.title ?? "").trim();
    const externalUrl = (payload?.externalUrl ?? "").trim();
    const provider = (payload?.provider ?? "").trim() || null;

    if (!title || !externalUrl) {
        return { ok: false, message: "title and externalUrl are required" };
    }
    if (!isHttpUrl(externalUrl)) {
        return { ok: false, message: "externalUrl must be a valid http/https URL" };
    }

    // Optional dedupe by external_url (unique index will enforce too)
    const exists = db.prepare(`
        SELECT * FROM videos
        WHERE external_url = ?
        LIMIT 1
    `).get(externalUrl);

    if (exists) {
        return { ok: true, deduped: true, item: mapVideoRow(exists) };
    }

    const info = db.prepare(`
        INSERT INTO videos (title, source_type, external_url, provider)
        VALUES (?, 'external', ?, ?)
    `).run(title, externalUrl, provider);

    const row = db.prepare(`SELECT * FROM videos WHERE id = ?`).get(info.lastInsertRowid);

    return { ok: true, deduped: false, item: mapVideoRow(row) };
});

// Delete a video (and remove from all playlists automatically via FK cascade)
ipcMain.handle("videos:delete", async (_event, videoId) => {
    const db = getDb();
    const id = Number(videoId);

    if (!id) return { ok: false, message: "videoId required" };

    const row = db.prepare(`SELECT * FROM videos WHERE id = ?`).get(id);
    if (!row) return { ok: false, status: 404, message: "Video not found" };

    // Delete DB record first (playlist_items cascades)
    db.prepare(`DELETE FROM videos WHERE id = ?`).run(id);

    // If local, delete stored file
    if (row.source_type === "local" && row.filename) {
        const filePath = join(videosDir(), row.filename);
        await promises.unlink(filePath).catch(() => {});
    }

    return { ok: true, deleted: mapVideoRow(row) };
});

// Open external link in browser
ipcMain.handle("videos:openExternal", async (_event, url) => {
    if (typeof url !== "string" || !url) return { ok: false, message: "Invalid URL" };
    if (!isHttpUrl(url)) return { ok: false, message: "Only http/https links allowed" };
    await shell.openExternal(url);
    return { ok: true };
});

// ------------------------- IPC: Playlists -------------------------

ipcMain.handle("playlists:list", async () => {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM playlists ORDER BY id DESC`).all();
    return { ok: true, items: rows };
});

ipcMain.handle("playlists:create", async (_event, payload) => {
    const db = getDb();
    const name = (payload?.name ?? "").trim();
    if (!name) return { ok: false, message: "Playlist name required" };

    const info = db.prepare(`INSERT INTO playlists (name) VALUES (?)`).run(name);
    const row = db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(info.lastInsertRowid);
    return { ok: true, item: row };
});

// Get playlist + its items (videos)
ipcMain.handle("playlists:getList", async (_event, payload) => {
    const db = getDb();
    const playlistId = Number(payload?.playlistId);

    if (!playlistId) return { ok: false, message: "playlistId required" };

    const playlist = db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(playlistId);
    if (!playlist) return { ok: false, status: 404, message: "Playlist not found" };

    const items = db.prepare(`
        SELECT v.*, pi.position, pi.added_at
        FROM playlist_items pi
        JOIN videos v ON v.id = pi.video_id
        WHERE pi.playlist_id = ?
        ORDER BY pi.position ASC
    `).all(playlistId);

    return { ok: true, playlist, items: items.map(mapVideoRow) };
});

// Add a library video to a playlist (reference-only; no duplication of file/video row)
ipcMain.handle("playlists:addItem", async (_event, payload) => {
    const db = getDb();
    const playlistId = Number(payload?.playlistId);
    const videoId = Number(payload?.videoId);

    if (!playlistId || !videoId) return { ok: false, message: "playlistId and videoId required" };

    // next position
    const posRow = db.prepare(`
        SELECT COALESCE(MAX(position), -1) AS maxPos
        FROM playlist_items
        WHERE playlist_id = ?
    `).get(playlistId);

    const nextPos = (posRow?.maxPos ?? -1) + 1;

    // PRIMARY KEY (playlist_id, video_id) prevents duplicates in same playlist
    db.prepare(`
        INSERT OR IGNORE INTO playlist_items (playlist_id, video_id, position)
        VALUES (?, ?, ?)
    `).run(playlistId, videoId, nextPos);

    return { ok: true };
});

ipcMain.handle("playlists:removeItem", async (_event, payload) => {
    const db = getDb();
    const playlistId = Number(payload?.playlistId);
    const videoId = Number(payload?.videoId);

    if (!playlistId || !videoId) return { ok: false, message: "playlistId and videoId required" };

    db.prepare(`
        DELETE FROM playlist_items
        WHERE playlist_id = ? AND video_id = ?
    `).run(playlistId, videoId);

    return { ok: true };
});

ipcMain.handle("playlists:deletePlaylist", async (_event, payload) => {
    const db = getDb();
    const playlistId = Number(payload?.playlistId);

    if (!playlistId) return { ok: false, message: "playlistId required" };

    db.prepare(`DELETE FROM playlists WHERE id = ?`).run(playlistId);
    // playlist_items will delete via cascade too, but this is safe even if cascade is off
    db.prepare(`DELETE FROM playlist_items WHERE playlist_id = ?`).run(playlistId);

    return { ok: true };
});

// ------------------------- Window / App lifecycle -------------------------

async function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 720,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: join(__dirname, "preload.js")
        }
    });

    // Dev: load Vite server; Prod: load built renderer
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
        await win.loadURL(devUrl);
    } else {
        await win.loadFile(join(__dirname, "..", "renderer", "dist", "index.html"));
    }
}

app.whenReady().then(async () => {
    try {
        // Ensure folder exists
        videosDir();

        // Serve local videos as: video://local/<id>
        protocol.registerFileProtocol("video", (request, callback) => {
            try {
                const u = new URL(request.url);

                // Expect: video://local/123
                if (u.host !== "local") return callback({ error: -302 });

                const id = Number(u.pathname.replace("/", ""));
                if (!id) return callback({ error: -324 });

                const db = getDb();
                const row = db.prepare(`SELECT * FROM videos WHERE id = ?`).get(id);

                if (!row || row.source_type !== "local" || !row.filename) {
                    return callback({ error: -6 }); // FILE_NOT_FOUND
                }

                const filePath = join(videosDir(), row.filename);
                if (!existsSync(filePath)) return callback({ error: -6 });

                callback({ path: filePath });
            } catch (e) {
                console.error("video:// protocol error:", e);
                callback({ error: -2 });
            }
        });

        await createWindow();
    } catch (err) {
        console.error("Failed to create window:", err);
        app.quit();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
});