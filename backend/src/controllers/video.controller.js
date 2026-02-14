const videoService = require("../services/video.service");

async function exists(req, res) {
    try {
        const result = await videoService.exists(req.userId, req.query.title);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function importLocal(req, res) {
    try {
        const result = await videoService.importLocal(req.userId, req.body);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function uploadExternal(req, res) {
    try {
        const result = await videoService.uploadExternal(req.userId, req.body);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function remove(req, res) {
    try {
        const result = await videoService.removeVideo(req.userId, req.params.id);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function list(req, res) {
    try {
        const result = await videoService.listVideos(req.userId);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports = {
    exists,
    importLocal,
    uploadExternal,
    remove,
    list
};