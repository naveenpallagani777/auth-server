const crypto = require("crypto");
const { AppError } = require("../helpers/AppError");
const { OIDC_ISSUER } = require("../config/env");



/**
 * Build OIDC authorization URL
 * This is the URL the client app should redirect the user to for login
 */
const getAuthorizeUrl = ({ clientId, redirectUrl, scope, state, responseType, codeChallenge, codeChallengeMethod }) => {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUrl,
        response_type: responseType || "code",
        scope: scope || "openid email profile",
        state: state || crypto.randomBytes(16).toString("hex"),
    });

    // PKCE support
    if (codeChallenge) {
        params.set("code_challenge", codeChallenge);
        params.set("code_challenge_method", codeChallengeMethod || "S256");
    }

    return {
        url: `${OIDC_ISSUER}/auth?${params.toString()}`,
        state: params.get("state"),
    };
};

/**
 * Exchange authorization code for tokens
 * Calls the OIDC provider's token endpoint internally
 */
const exchangeCodeForToken = async ({ code, clientId, clientSecret, redirectUrl, codeVerifier }) => {
    const tokenUrl = `${OIDC_ISSUER}/token`;

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUrl,
    });

    // PKCE support
    if (codeVerifier) {
        body.set("code_verifier", codeVerifier);
    }

    // Build authorization header (client_secret_basic)
    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: authHeader,
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new AppError(data.error_description || data.error || "Failed to exchange authorization code for access token.", response.status);
    }

    return data;
};

/**
 * Refresh an access token using a refresh token
 */
const refreshToken = async ({ refreshToken, clientId, clientSecret }) => {
    const tokenUrl = `${OIDC_ISSUER}/token`;

    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    });

    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: authHeader,
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new AppError(data.error_description || data.error || "Failed to refresh your session tokens. Please log in again.", response.status);
    }

    return data;
};

/**
 * Verify a token using OIDC introspection
 */
const verifyToken = async ({ token, clientId, clientSecret, tokenTypeHint }) => {
    const introspectionUrl = `${OIDC_ISSUER}/token/introspection`;

    const body = new URLSearchParams({
        token,
    });

    if (tokenTypeHint) {
        body.set("token_type_hint", tokenTypeHint);
    }

    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

    const response = await fetch(introspectionUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: authHeader,
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new AppError(data.error_description || data.error || "The provided token is invalid or has expired.", response.status);
    }

    return data;
};

module.exports = { getAuthorizeUrl, exchangeCodeForToken, refreshToken, verifyToken };
