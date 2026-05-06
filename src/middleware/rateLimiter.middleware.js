const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        message: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: {
        success: false,
        message: "Too many auth attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
