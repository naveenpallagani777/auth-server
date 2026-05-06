const app = require("./src/app");
const { connectDB } = require("./src/config/db");
const { createOIDCProvider } = require("./src/config/oidc");
const { buildInteractionRoutes } = require("./src/routes/interaction.route");
const { errorHandler, notFoundHandler } = require("./src/middleware/error.middleware");
const { PORT, OIDC_ISSUER } = require("./src/config/env");

const startServer = async () => {
    try {

        // connect to db
        await connectDB();

        // create OIDC provider
        const provider = createOIDCProvider();

        // Mount OIDC interaction routes
        app.use("/oauth2/v1/interaction", buildInteractionRoutes(provider));

        // Mount OIDC provider at /oidc prefix
        app.use("/oidc", provider.callback());

        // Error handlers must be mounted LAST, after all routes
        app.use(notFoundHandler);
        app.use(errorHandler);

        app.listen(PORT, () => {
            console.log(`✅ Auth server running on http://localhost:${PORT}`);
            console.log(`🔑 OIDC Issuer: ${OIDC_ISSUER}`);
            console.log(`📋 Discovery: ${OIDC_ISSUER}/.well-known/openid-configuration`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

