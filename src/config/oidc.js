const { Provider } = require("oidc-provider");
const {
    OIDC_ISSUER,
    OIDC_COOKIE_KEYS,
} = require("./env");
const MongoAdapter = require("../adapters/mongo.adapter");
const UserModel = require("../models/user.model");
const { loadOrGenerateJWKS } = require("../helpers/jwks");

/**
 * OIDC Provider configuration
 * Docs: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md
 */
const oidcConfig = {
    adapter: MongoAdapter,
    jwks: loadOrGenerateJWKS(),

    cookies: {
        keys: OIDC_COOKIE_KEYS,
    },

    claims: {
        openid: ["sub"],
        email: ["email", "email_verified"],
        profile: ["name", "picture"],
    },

    features: {
        devInteractions: { enabled: false },
        introspection: { enabled: true },
        revocation: { enabled: true },
    },

    extraClientMetadata: {
        properties: [
            "access_token_ttl",
            "id_token_ttl",
            "refresh_token_ttl",
            "auth_code_ttl",
        ],
    },

    ttl: {
        AccessToken: function (ctx, token, client) {
            return (client && client.access_token_ttl) || 3600;
        },
        AuthorizationCode: function (ctx, code, client) {
            return (client && client.auth_code_ttl) || 600;
        },
        IdToken: function (ctx, token, client) {
            return (client && client.id_token_ttl) || 3600;
        },
        RefreshToken: function (ctx, token, client) {
            return (client && client.refresh_token_ttl) || 1209600;
        },
        Interaction: 3600, // 1 hour
        Session: 14 * 24 * 60 * 60, // 14 days
        Grant: 14 * 24 * 60 * 60, // 14 days
    },

    /**
     * Issue Refresh Token without requiring offline_access scope
     */
    issueRefreshToken: async (ctx, client, code) => {
        return client.grantTypeAllowed("refresh_token");
    },

    /**
     * Find user account for OIDC token issuance
     */
    findAccount: async (ctx, id) => {
        const user = await UserModel.findById(id).lean();
        if (!user) return undefined;

        return {
            accountId: user._id.toString(),
            async claims(use, scope) {
                const claims = { sub: user._id.toString() };

                if (scope && scope.includes("email")) {
                    claims.email = user.email;
                    claims.email_verified = user.emailVerified || false;
                }

                if (scope && scope.includes("profile")) {
                    claims.name = user.name;
                    claims.picture = user.picture;
                }

                return claims;
            },
        };
    },

    /**
     * Interaction URL — where to redirect the user for login/consent
     * This points to our interaction API routes
     */
    interactions: {
        url: (ctx, interaction) => {
            return `/oauth2/v1/interaction/${interaction.uid}`;
        },
    },

    /**
     * Load clients dynamically from MongoDB
     * Clients configured via static array will be merged with DB clients
     */
    clients: [],

    /**
     * PKCE configuration — required for public clients
     */
    pkce: {
        methods: ["S256"],
        required: () => false,
    },
};

/**
 * Create and configure the OIDC provider instance
 */
const createOIDCProvider = () => {
    const provider = new Provider(OIDC_ISSUER, oidcConfig);

    // Allow HTTP in development (oidc-provider enforces HTTPS by default)
    if (process.env.NODE_ENV === "development") {
        const { invalidate: orig } = provider.Client.Schema.prototype;
        provider.Client.Schema.prototype.invalidate = function (message, code) {
            if (code === "implicit-force-https" || code === "implicit-forbid-localhost") {
                return;
            }
            return orig.call(this, message, code);
        };
    }

    // Log OIDC provider errors for debugging
    provider.on("server_error", (ctx, err) => {
        console.error("🔴 OIDC Server Error:", err);
    });
    provider.on("grant.error", (ctx, err) => {
        console.error("🔴 OIDC Grant Error:", err);
    });
    provider.on("authorization.error", (ctx, err) => {
        console.error("🔴 OIDC Authorization Error:", err.message, err.error_description);
    });
    provider.on("interaction.error", (ctx, err) => {
        console.error("🔴 OIDC Interaction Error:", err.message, err.error_description);
    });

    return provider;
};

module.exports = { createOIDCProvider, oidcConfig };
