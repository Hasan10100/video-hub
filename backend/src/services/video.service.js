const Video = require("../models/Video");

async function exists(userId, title) {
    const cleanTitle = (title || "").trim();
    if (!cleanTitle) {
        return {
            status: 400,
            body: { message: "title query param is required" }
        };
    }

    const found = await Video.exists({
        ownerId: userId,
        title: cleanTitle
    });

    return {
        status: 200,
        body: { ok: true, exists: !!found, title: cleanTitle }
    };
}

async function importLocal(userId, payload) {
    const title = (payload.title || "").trim();
    const filename = (payload.filename || "").trim();
    const mimeType = payload.mimeType || "application/octet-stream";
    const size = Number(payload.size) || 0;

    if (!filename || !title) {
        return {
            status: 400,
            body: { message: "filename and title are required" }
        };
    }

    try {
        const video = await Video.create({
            ownerId: userId,
            sourceType: "local",
            title,
            filename,
            mimeType,
            size
        });

        return { status: 201, body: { message: "Registered", video } };
    } catch (err) {
        if (err?.code === 11000) {
            return { status: 409, body: { message: "A video with this name already exists" } };
        }
        return { status: 500, body: { message: "Failed to register video", error: err.message } };
    }
}

async function uploadExternal(userId, payload) {
    const title = (payload.title || "").trim();
    const externalUrl = payload.externalUrl || "";
    const provider = payload.provider?.trim() || undefined;

    if (!title || !externalUrl) {
        return {
            status: 400,
            body: { message: "title and externalUrl are required" }
        };
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(externalUrl);
    } catch {
        return {
            status: 400,
            body: { message: "externalUrl must be a valid URL" }
        };
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return {
            status: 400,
            body: { message: "Only http/https URLs are allowed" }
        };
    }

    try {
        const video = await Video.create({
            ownerId: userId,
            sourceType: "external",
            title,
            externalUrl: parsedUrl.toString(),
            provider
        });

        return { status: 201, body: { message: "Registered", video } };
    } catch (err) {
        if (err?.code === 11000) {
            return { status: 409, body: { message: "A video with this title already exists" } };
        }
        return { status: 500, body: { message: "Failed to register video" } };
    }
}

async function removeVideo(userId, id) {
    const video = await Video.findOne({ _id: id, ownerId: userId });
    if (!video) {
        return { status: 404, body: { message: "Video not found" } };
    }

    await Video.deleteOne({ _id: video._id });

    return {
        status: 200,
        body: {
            ok: true,
            sourceType: video.sourceType,
            filename: video.filename || null,
            title: video.title
        }
    };
}

async function listVideos(userId) {
    const videos = await Video.find({ ownerId: userId }).sort({ createdAt: -1 });
    return { status: 200, body: { videos } };
}

module.exports = {
    exists,
    importLocal,
    uploadExternal,
    removeVideo,
    listVideos
};