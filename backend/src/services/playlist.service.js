const Playlist = require("../models/Playlist");
const Video = require("../models/Video");

async function createPlaylist(userId, name) {
    const cleanName = (name || "").trim();
    if (!cleanName) {
        return { status: 400, body: { message: "name is required" } };
    }

    try {
        const playlist = await Playlist.create({
            ownerId: userId,
            name: cleanName,
            videoIds: []
        });

        return { status: 201, body: { ok: true, playlist } };
    } catch (err) {
        if (err?.code === 11000) {
            return { status: 409, body: { message: "Playlist name already exists" } };
        }
        return { status: 500, body: { message: "Server error" } };
    }
}

async function listPlaylists(userId) {
    const playlists = await Playlist.find({ ownerId: userId }).sort({ createdAt: -1 });
    return { status: 200, body: { ok: true, playlists } };
}

async function getPlaylist(userId, playlistId) {
    const playlist = await Playlist
        .findOne({ _id: playlistId, ownerId: userId })
        .populate("videoIds");

    if (!playlist) {
        return { status: 404, body: { message: "Playlist not found" } };
    }

    return { status: 200, body: { ok: true, playlist } };
}

async function addItem(userId, playlistId, videoId) {
    if (!videoId) {
        return { status: 400, body: { message: "videoId is required" } };
    }

    const playlist = await Playlist.findOne({ _id: playlistId, ownerId: userId });
    if (!playlist) {
        return { status: 404, body: { message: "Playlist not found" } };
    }

    const video = await Video.findOne({ _id: videoId, ownerId: userId });
    if (!video) {
        return { status: 404, body: { message: "Video not found" } };
    }

    if (playlist.videoIds.some((id) => String(id) === String(videoId))) {
        return { status: 409, body: { message: "Video already in playlist" } };
    }

    playlist.videoIds.push(videoId);
    await playlist.save();

    return { status: 200, body: { ok: true } };
}

async function removeItem(userId, playlistId, videoId) {
    const playlist = await Playlist.findOne({ _id: playlistId, ownerId: userId });
    if (!playlist) {
        return { status: 404, body: { message: "Playlist not found" } };
    }

    playlist.videoIds = playlist.videoIds.filter((id) => String(id) !== String(videoId));
    await playlist.save();

    return { status: 200, body: { ok: true } };
}

module.exports = {
    createPlaylist,
    listPlaylists,
    getPlaylist,
    addItem,
    removeItem
};