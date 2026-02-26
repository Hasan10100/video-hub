// Local SQLite DB for single-user desktop app

import { join } from "path";
import Database from "better-sqlite3";
import { app } from "electron";

let db = null;

function getDbPath() {
    return join(app.getPath("userData"), "video-hub.db");
}

export function getDb() {
    if (db) return db;

    const dbPath = getDbPath();
    db = new Database(dbPath);

    // Good defaults for desktop stability & concurrency
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,

            -- storage identity (local files only)
            filename TEXT,

            -- true identity for dedupe (local files only)
            content_hash TEXT,

            -- local vs external link
            source_type TEXT NOT NULL CHECK (source_type IN ('local', 'external')),

            -- external links only
            external_url TEXT,
            provider TEXT,

            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS playlist_items (
            playlist_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            added_at TEXT NOT NULL DEFAULT (datetime('now')),

            PRIMARY KEY (playlist_id, video_id),

            FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        );

        -- Fast lookups
        CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);

        -- Dedup local files by hash (NULL allowed for external videos)
        CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_content_hash
        ON videos(content_hash)
        WHERE content_hash IS NOT NULL;

        -- Optional: prevent duplicate external links (if you want)
        CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_external_url
        ON videos(external_url)
        WHERE external_url IS NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist
        ON playlist_items(playlist_id);
    `);

    return db;
}