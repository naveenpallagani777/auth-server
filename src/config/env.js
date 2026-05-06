require("dotenv").config();

const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT, 10) || 4000,

    // Database
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/auth-server",

    // OIDC Provider
    OIDC_ISSUER: process.env.OIDC_ISSUER || "http://localhost:4000",
    OIDC_COOKIE_KEYS: (process.env.OIDC_COOKIE_KEYS || "dev-cookie-secret").split(","),


    // Admin
    ADMIN_API_KEY: process.env.ADMIN_API_KEY || "dev-admin-api-key-change-me",

    // Social Logins
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || "",
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || "",

    // Encryption
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef", // Must be 32 chars for AES-256

    // Email Service (Brevo)
    BREVO_API_KEY: process.env.BREVO_API_KEY || "",
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || "naveenpallagani77@gmail.com",
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || "Auth Server",
};

module.exports = env;
