# 🎬 Video Hub – Desktop Video Aggregation App

A secure cross-platform desktop application built with **Electron + React + Express** that allows users to manage and play videos from multiple sources (local files, YouTube, Vimeo) in a unified interface.

---
## 🚀 Overview

Video Hub provides:

- 🔐 Secure user authentication  
- 🎥 Unified global video library (Local + External)  
- 📂 Playlist creation and management  
- ▶ Integrated video playback  

This project demonstrates secure Electron architecture using `contextBridge` with a fully separated backend.

---
## ✨ Core Features

### 🔐 Authentication
- User Registration
- Login / Logout
- Secure session handling

### 🎥 Video Library
- Upload local videos
- Add YouTube / Vimeo links
- Filter: All / Local / External
- Dedicated in-app player

### 📂 Playlists
- Create & manage playlists
- Add videos from global library
- Remove videos without deleting globally

---
## 🧱 Tech Stack

- **Desktop Framework:** Electron  
- **Frontend (Renderer):** React + Vite  
- **Preload Layer:** contextBridge (secure API exposure)  
- **Backend:** Node.js + Express  
- **Database:** MongoDB + Mongoose  
- **Authentication:** bcrypt + Sessions / JWT  
- **External Playback:** YouTube IFrame API, Vimeo Player API  

---
## 🏗 Architecture

**Architecture Pattern:**  
Client–Server + Layered Backend + Secure Context Isolation  

---
### 🔒 Security Principles

- `contextIsolation: true`
- `nodeIntegration: false`
- Controlled API exposure via preload
- Backend input validation
- Password hashing with bcrypt
- Session cleanup on logout

---