const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        videoIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
    },
    { timestamps: true }
);

// Prevent duplicate playlist names for a user
PlaylistSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Playlist", PlaylistSchema);