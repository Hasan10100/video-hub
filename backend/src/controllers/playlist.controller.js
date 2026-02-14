const playlistService = require("../services/playlist.service.js");

async function create(req, res) {
    try {
        const result = await playlistService.createPlaylist(req.userId, req.body.name);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function list(req, res) {
    try {
        const result = await playlistService.listPlaylists(req.userId);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function getById(req, res) {
    try {
        const result = await playlistService.getPlaylist(req.userId, req.params.id);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function addItem(req, res) {
    try {
        const result = await playlistService.addItem(req.userId, req.params.id, req.body.videoId);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function removeItem(req, res) {
    try {
        const result = await playlistService.removeItem(req.userId, req.params.id, req.params.videoId);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: "Server error" });
    }
}

async function deletePlaylist(req, res) {
    try {
        const result = await playlistService.deletePlaylist(req.userId, req.params.id);
        return res.status(result.status).json(result.body);
    } catch (err) {
        return res.status(500).json({ message: err.message || "Server error" });
    }
}

module.exports = {
    create,
    list,
    getById,
    addItem,
    removeItem,
    deletePlaylist
};