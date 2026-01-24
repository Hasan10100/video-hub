const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
    {
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    originalName: {
        type: String,
        required: true
    },

    filename: {
        type: String,
        required: true
    },

    mimeType: {
        type: String,
        required: true
    },

    size: {
        type: Number,
        required: true
    },

    url: {
        type: String,
        required: true
    }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Video", VideoSchema);
