const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        sourceType: {
            type: String,
            enum: ["local", "external"],
            required: true,
            default: "local",
            index: true,
        },

        // Human-friendly name shown in UI (works for both local + external)
        title: {
            type: String,
            required: true,
            trim: true,
        },

        // ===== Local-only =====
        filename: {
            type: String,
            required: function () {
                return this.sourceType === "local";
            },
        },
        mimeType: {
            type: String,
            required: function () {
                return this.sourceType === "local";
            },
        },
        size: {
            type: Number,
            required: function () {
                return this.sourceType === "local";
            },
        },

        // ===== External-only =====
        externalUrl: {
            type: String,
            required: function () {
                return this.sourceType === "external";
            },
            trim: true,
        },
        provider: {
            type: String, // "youtube", "vimeo", "direct", etc.
            required: false,
            trim: true,
        },

        // Optional for both
        thumbnailUrl: { type: String, required: false, trim: true },
        durationSec: { type: Number, required: false },
    },
    { timestamps: true }
);

// Prevent same title per user (your Option 1 duplicate prevention)
VideoSchema.index({ ownerId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model("Video", VideoSchema);
