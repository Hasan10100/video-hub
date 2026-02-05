const express = require("express");
const router = express.Router();
const Video = require("../models/Video")
const { requireAuth } = require("../middleware/auth.middleware");

router.get("/exists", requireAuth, async (req, res) => {
    const title = (req.query.title || "").trim();
    if (!title) {
        return res.status(400).json({ message: "title query param is required" });
    }

    const exists = await Video.exists({
        ownerId: req.userId,
        title,
    });

    res.json({ ok: true, exists: !!exists, title });
});

router.post("/import", requireAuth, async (req, res) => {
    const { title, filename, mimeType, size } = req.body;

    if (!filename || !title) {
        return res.status(400).json({ message: "filename and title are required" });
    }

    try {
        const video = await Video.create({
            ownerId: req.userId,
            sourceType: "local",
            title:title.trim(),
            filename:filename.trim(),
            mimeType: mimeType || "application/octet-stream",
            size: Number(size) || 0,
        });
        return res.status(201).json({ message: "Registered", video });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "A video with this name already exists" });
        }
        return res.status(500).json({ message: "Failed to register video", error: err.message });
    }
});

router.post("/upload", requireAuth, async (req, res) => {
    const { title, externalUrl, provider } = req.body;

    if (!title || !externalUrl) {
        return res.status(400).json({ message: "title and externalUrl are required" });
    }

    // URL validation
    let parsedUrl;
    try {
        parsedUrl = new URL(externalUrl);
    } catch {
        return res.status(400).json({ message: "externalUrl must be a valid URL" });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return res.status(400).json({ message: "Only http/https URLs are allowed" });
    }

    try {
        const video = await Video.create({
        ownerId: req.userId,
        sourceType: "external",
        title: title.trim(),
        externalUrl: parsedUrl.toString(),
        provider: provider?.trim() || undefined,
        });

        return res.status(201).json({ message: "Registered", video });
    } catch (err) {
        if (err.code === 11000) {
        return res.status(409).json({ message: "A video with this title already exists" });
        }
        return res.status(500).json({ message: "Failed to register video" });
    }
});

router.delete("/delete/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    const video = await Video.findOne({ _id: id, ownerId: req.userId });
    if (!video) return res.status(404).json({ message: "Video not found" });

    await Video.deleteOne({ _id: video._id });

    // Return enough info for Electron to cleanup local file if needed
    res.json({
        ok: true,
        sourceType: video.sourceType,
        filename: video.filename || null,
        title: video.title,
    });
});

router.get("/list", requireAuth, async (req, res) => {
    const videos = await Video.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json({ videos });
});

module.exports = router;