const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { requireApiKey } = require("../middleware/apiKey.middleware");

// Admin-only user management routes
router.get("/:id", requireApiKey, userController.getUserById);

module.exports = router;
