# 🎬 Video Hub – Desktop Media Manager

A single-user desktop media management application built with **Electron + SQLite**, designed for managing local and external videos with structured playlists.

> Refactored from a full-stack architecture into a clean, self-contained desktop application.

## 🚀 Overview

Video Hub is a lightweight desktop application that allows users to:

- Import and manage local video files
- Add external video links (YouTube, Vimeo, direct URLs)
- Organize videos into playlists
- Avoid duplicate storage using content hashing
- Play media directly within the application

This version focuses on **single-user, offline-first architecture**, eliminating backend complexity while maintaining structured data management.

## ✨ Key Principles

- No backend server
- No authentication layer
- SQLite for persistent local storage
- Videos stored inside app-controlled directory
- Playlists reference videos (no duplication)

## 📦 Features

### 🎞 Local Video Import

- File picker dialog
- SHA-256 hashing
- Duplicate detection
- Stored in app-managed directory

### 🌐 External Videos

- Save URL + metadata
- Open externally if needed
- Treated as first-class video entries

### 📂 Playlists

- Create / Delete playlists
- Add existing videos
- Remove from playlist (without deleting from library)

## 🛠 Tech Stack

- **Electron**
- **Node.js**
- **better-sqlite3**
- Vanilla HTML/CSS -> **React - Typescript** (Future)