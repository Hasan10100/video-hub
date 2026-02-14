const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");
const fs = require("fs");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

let backendProcess;
let AUTH_TOKEN = null; // keeps JWT in main process memory

const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const EXISTS_ENDPOINT = `${BACKEND_URL}/api/videos/exists`;
const IMPORT_ENDPOINT = `${BACKEND_URL}/api/videos/import`;
const UPLOAD_ENDPOINT = `${BACKEND_URL}/api/videos/upload`;
const DELETE_ENDPOINT = `${BACKEND_URL}/api/videos/delete`;
const PLAYLISTS_ENDPOINT = `${BACKEND_URL}/api/playlists`;


function startBackend() {
    const backendEntry = path.join(__dirname, "..", "backend", "src", "server.js");

    backendProcess = spawn(process.execPath, [backendEntry], {
        stdio: "inherit",
        env: {
        ...process.env,
        PORT: BACKEND_PORT,
        },
        windowsHide: true,
    });

    backendProcess.on("exit", (code) => {
        console.log("Backend exited with code:", code);
    });
}

function videosDir() {
    const dir = path.join(app.getPath("userData"), "videos");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function makeId() {
    return crypto.randomBytes(16).toString("hex");
}

const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

ipcMain.handle("api:health", async () => {
    const res = await fetch("http://localhost:5000/api/health");
    return res.json();
});

ipcMain.handle("auth:register", async (_event, { name, email, password }) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Send a clean error back to renderer
        return { ok: false, message: data.message || "User creation failed", status: res.status };
    }

    // Adjust these keys to match your backend response!
    // Common: data.token OR data.accessToken
    const token = data.token;

    if (!token) {
        return { ok: false, message: "No token returned by server" };
    }

    AUTH_TOKEN = token;

    return { ok: true, message: "Logged in", user: data.user || null };
});

ipcMain.handle("auth:login", async (_event, { email, password }) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Send a clean error back to renderer
        return { ok: false, message: data.message || "Login failed", status: res.status };
    }

    // Adjust these keys to match your backend response!
    // Common: data.token OR data.accessToken
    const token = data.token;

    if (!token) {
        return { ok: false, message: "No token returned by server" };
    }

    AUTH_TOKEN = token;

    return { ok: true, message: "Logged in", user: data.user || null };
});

ipcMain.handle("auth:status", async () => {
    return { ok: true, loggedIn: !!AUTH_TOKEN };
});

ipcMain.handle("auth:logout", async () => {
    AUTH_TOKEN = null;
    return { ok: true, message : "Logged Out"};
});

//---------------------------------------------------------------------------------------

ipcMain.handle("videos:import", async () => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };

    // pick file
    const r = await dialog.showOpenDialog({
        title: "Import a video",
        properties: ["openFile"],
        filters: [
        { name: "Videos", extensions: ["mp4", "mov", "mkv", "webm", "avi"] },
        { name: "All Files", extensions: ["*"] },
        ],
    });

    if (r.canceled || !r.filePaths?.length) return { ok: false, message: "Canceled" };

    const src = r.filePaths[0];
    const title = path.basename(src);
    const ext = path.extname(src);

    // precheck
    const qs = new URLSearchParams({ title }).toString();
    const existsRes = await fetch(`${EXISTS_ENDPOINT}?${qs}`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    const existsData = await existsRes.json().catch(() => ({}));

    if (!existsRes.ok) {
        return { ok: false, status: existsRes.status, message: existsData.message || "Precheck failed" };
    }

    if (existsData.exists) {
        return { ok: false, status: 409, code: "DUPLICATE_NAME", message: "A video with this name already exists." };
    }

    // copy into app storage
    const videoDir = videosDir();
    const filename = `${makeId()}${ext}`;
    const dest = path.join(videoDir, filename);

    await fs.promises.copyFile(src, dest);

    const stat = await fs.promises.stat(dest);
    const fileUrl = pathToFileURL(dest).href; // file:///...

    // 3) register metadata (JSON only)
    const res = await fetch(IMPORT_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({
            title,
            filename,
            size: stat.size,
            mimeType: null,
        }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return { ok: false, status: res.status, message: data.message || "Register failed"};
    }

    return { ok: true, video: data.video, fileUrl };
});

ipcMain.handle("videos:upload", async (_e, payload) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };

    const title = payload?.title?.trim();
    const externalUrl = payload?.externalUrl?.trim();
    const provider = payload?.provider?.trim();

    if (!title || !externalUrl) {
        return { ok: false, message: "title and externalUrl are required" };
    }

    const res = await fetch(`${UPLOAD_ENDPOINT}`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ title, externalUrl, provider }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { ok: false, status: res.status, message: data.message || "Failed", error: data };
    }

    return { ok: true, video: data.video };
});

ipcMain.handle("videos:delete", async (_e, videoId) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };
    if (!videoId) return { ok: false, message: "videoId is required" };

    const res = await fetch(`${DELETE_ENDPOINT}/${videoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { ok: false, status: res.status, message: data.message || "Delete failed" };
    }

    // If it's a local video, delete file from app storage
    if (data.sourceType === "local" && data.filename) {
        const filePath = path.join(videosDir(), data.filename);
        await fs.promises.unlink(filePath).catch(() => {});
    }

    return { ok: true, deleted: data };
});

ipcMain.handle("videos:list", async () => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };

    const res = await fetch(`${BACKEND_URL}/api/videos/list`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        return { ok: false, status: res.status, message: data.message || "Failed to fetch videos" };
    }

    const videos = Array.isArray(data.videos) ? data.videos : [];

    const enriched = videos.map((v) => {
        const localPath = v?.filename ? path.join(videosDir(), v.filename) : null;
        const exists = localPath ? fs.existsSync(localPath) : false;
        const fileUrl = exists ? pathToFileURL(localPath).href : null;

        return { ...v, fileUrl, missing: !exists };
    });

    return { ok: true, videos: enriched };
});

ipcMain.handle("videos:openExternal", async (_e, url) => {
    if (typeof url !== "string" || !url) return { ok: false, message: "Invalid URL" };

    try {
        const u = new URL(url);
        if (!["http:", "https:"].includes(u.protocol)) {
        return { ok: false, message: "Only http/https links allowed" };
        }
    } catch {
        return { ok: false, message: "Invalid URL" };
    }

    await shell.openExternal(url);
    return { ok: true };
});

//---------------------------------------------------------------------------------------

ipcMain.handle("playlists:list", async () => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };

    const res = await fetch(PLAYLISTS_ENDPOINT, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: data.message };

    return { ok: true, playlists: data.playlists || [] };
});

ipcMain.handle("playlists:getList", async (_e, { playlistId }) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };
    if (!playlistId) return { ok: false, message: "playlistId required" };

    const res = await fetch(`${PLAYLISTS_ENDPOINT}/${playlistId}`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: data.message };

    return { ok: true, playlist: data.playlist };
});

ipcMain.handle("playlists:create", async (_e, {playlistName}) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };

    const modName = (playlistName || "").trim();
    if (!modName) return { ok: false, message: "name required" };

    const res = await fetch(PLAYLISTS_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ name: modName }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: data.message };

    return { ok: true, playlist: data.playlist };
});

ipcMain.handle("playlists:addItem", async (_e, { playlistId, videoId }) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };
    if (!playlistId || !videoId) return { ok: false, message: "playlistId and videoId required" };

    const res = await fetch(`${PLAYLISTS_ENDPOINT}/${playlistId}/items`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ videoId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: data.message };

    return { ok: true };
});

ipcMain.handle("playlists:removeItem", async (_e, { playlistId, videoId }) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };
    if (!playlistId || !videoId) return { ok: false, message: "playlistId and videoId required" };

    const res = await fetch(`${PLAYLISTS_ENDPOINT}/${playlistId}/items/${videoId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: data.message };

    return { ok: true };
});

ipcMain.handle("playlists:deletePlaylist", async (_e, { playlistId }) => {
    if (!AUTH_TOKEN) return { ok: false, message: "Not authenticated" };
    if (!playlistId) return { ok: false, message: "playlistId required" };

    const res = await fetch(`${PLAYLISTS_ENDPOINT}/${playlistId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: data.message };

    return { ok: true};
});
//---------------------------------------------------------------------------------------

async function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, "preload.js")
        }
    });

    try {
        await waitOn({
            resources: [`${BACKEND_URL}/api/health`],
            timeout: 30_000,
            interval: 250,
            // accepts non-200 if server responds
            validateStatus: (status) => status >= 200 && status < 500,
        });
        const devUrl = process.env.VITE_DEV_SERVER_URL;

        if (devUrl) {
            // Dev: Vite server
            await win.loadURL(devUrl);
        } else {
            // Prod: built files
            await win.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"));
        }

    } catch (err) {
        // If backend never became ready, show a simple error page
        await win.loadURL("data:text/html," + encodeURIComponent(
            `<h2>Backend failed to start</h2>
            <p>Could not reach ${BACKEND_URL}/api/health within 30 seconds.</p>
            <pre>${String(err)}</pre>
            `)
        );
    }
}

app.whenReady().then(async () => {
    startBackend();
    await createWindow();
});

app.on("before-quit", () => {
    if (backendProcess && !backendProcess.killed) backendProcess.kill();
});