const express = require("express");
const router = express.Router();
const Playlist = require("../models/Playlist")
const Video = require("../models/Video")
const { requireAuth } = require("../middleware/auth.middleware");

router.post("/", requireAuth, async (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    try {
        const playlist = await Playlist.create({
            ownerId: req.userId,
            name,
            videoIds: [],
        });
        return res.status(201).json({ ok: true, playlist });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(409).json({ message: "Playlist name already exists" });
    }
    return res.status(500).json({ message: "Server error" });
    } 
});

router.get("/", requireAuth, async (req, res) => {
    const playlists = await Playlist.find({ ownerId: req.userId })
        .sort({ createdAt: -1 });

    res.json({ ok: true, playlists });
});

router.get("/:id", requireAuth, async (req, res) => {
    const playlist = await Playlist.findOne({_id: req.params.id, ownerId: req.userId}).populate("videoIds");
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json({ ok: true, playlist });
});

router.post("/:id/items", requireAuth, async (req, res) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ message: "videoId is required" });

    const playlist = await Playlist.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    // Ensure the video belongs to the same user
    const video = await Video.findOne({ _id: videoId, ownerId: req.userId });
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Prevent duplicates inside a playlist
    if (playlist.videoIds.some((id) => String(id) === String(videoId))) {
        return res.status(409).json({ message: "Video already in playlist" });
    }

    playlist.videoIds.push(videoId);
    await playlist.save();

    res.json({ ok: true });
});

router.delete("/:id/items/:videoId", requireAuth, async (req, res) => {
    const playlist = await Playlist.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const videoId = req.params.videoId;
    playlist.videoIds = playlist.videoIds.filter((id) => String(id) !== String(videoId));
    await playlist.save();

    res.json({ ok: true });
});

module.exports = router;