const { NODE_ENV } = require("../config/env");

/**
 * 404 handler — catch routes that don't match
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`❌ [${statusCode}] ${message}`, NODE_ENV === "development" ? err.stack : "");

    res.status(statusCode).json({
        success: false,
        message,
        ...(NODE_ENV === "development" && { stack: err.stack }),
    });
};

module.exports = { notFoundHandler, errorHandler };
