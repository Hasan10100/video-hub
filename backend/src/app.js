const express = require("express");
const authRoutes = require("./routes/auth.routes");
const videoRoutes = require("./routes/video.routes");
const path = require("path");


const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes)
app.use("/media", express.static(path.join(__dirname, "..", "uploads")));


module.exports = app;