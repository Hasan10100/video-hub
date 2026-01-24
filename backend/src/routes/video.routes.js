const express = require("express");
const router = express.Router();
const Video = require("../models/Video")
const path = require("path");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");

// 1) Configure where to store files + how to name them
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Save into backend/uploads
        cb(null, path.join(__dirname, "..", "..", "uploads"));
    },
    filename: (req, file, cb) => {
        // Create a unique filename to avoid overwriting
        const ext = path.extname(file.originalname);
        const safeBase = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

        cb(null, `${Date.now()}-${safeBase}${ext}`);
    }
    });

// 2) Optional: accept only video files (simple check)
function fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"), false);
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

// 3) Upload route (protected)
router.post("/upload", requireAuth, upload.single("video"), async (req, res) => {
    // multer puts file info into req.file
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Public URL where it can be accessed
    const url = `/media/${req.file.filename}`;

    const video = await Video.create({
        ownerId: req.userId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url
    });

    res.status(201).json({
        message: "Uploaded",
        video
    });
});

router.get("/list", requireAuth, async (req, res) => {
    const videos = await Video.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json({ videos });
});


module.exports = router;
