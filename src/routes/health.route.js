const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Auth server is healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

module.exports = router;
