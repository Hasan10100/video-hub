const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlist.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.post("/", requireAuth, playlistController.create);
router.get("/", requireAuth, playlistController.list);
router.get("/:id", requireAuth, playlistController.getById);
router.post("/:id/items", requireAuth, playlistController.addItem);
router.delete("/:id/items/:videoId", requireAuth, playlistController.removeItem);

module.exports = router;