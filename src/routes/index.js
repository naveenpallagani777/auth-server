const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.route");
const clientRoutes = require("./client.route");
const userRoutes = require("./user.route");
const healthRoutes = require("./health.route");

router.use("/auth", authRoutes);
router.use("/client", clientRoutes);
router.use("/user", userRoutes);
router.use("/health", healthRoutes);

module.exports = router;
