const express = require("express");
const router = express.Router();
const videoController = require("../controllers/video.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.get("/exists", requireAuth, videoController.exists);
router.post("/import", requireAuth, videoController.importLocal);
router.post("/upload", requireAuth, videoController.uploadExternal);
router.delete("/delete/:id", requireAuth, videoController.remove);
router.get("/list", requireAuth, videoController.list);

module.exports = router;