const { ADMIN_API_KEY } = require("../config/env");
const { AppError } = require("../helpers/AppError");

/**
 * Authenticate requests via X-API-Key header
 * Used to protect admin routes (client management)
 */
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        throw new AppError("Access denied. Please provide a valid administration API key.", 401);
    }

    if (apiKey !== ADMIN_API_KEY) {
        throw new AppError("Access denied. The provided administration API key is incorrect.", 403);
    }

    next();
};

module.exports = { requireApiKey };
