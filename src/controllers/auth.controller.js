const authService = require("../services/auth.service");
const { catchAsync } = require("../helpers/catchAsync");

/**
 * POST /api/auth/authorize
 * Returns the OIDC authorization URL to redirect the user to
 *
 * Flow: Client calls this → gets URL → redirects user to URL →
 *       user logs in via /interaction → code is sent to redirect_uri
 */
const authorize = catchAsync(async (req, res) => {
    const { clientId, redirectUrl, scope, state, responseType, codeChallenge, codeChallengeMethod } = req.body;

    const result = authService.getAuthorizeUrl({
        clientId,
        redirectUrl,
        scope,
        state,
        responseType,
        codeChallenge,
        codeChallengeMethod,
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/auth/token
 * Exchange authorization code for tokens (access_token, id_token, refresh_token)
 */
const token = catchAsync(async (req, res) => {
    const { code, clientId, clientSecret, redirectUrl, codeVerifier } = req.body;

    const tokens = await authService.exchangeCodeForToken({
        code,
        clientId,
        clientSecret,
        redirectUrl,
        codeVerifier,
    });

    res.status(200).json({
        success: true,
        message: "Token exchange successful",
        data: tokens,
    });
});

/**
 * POST /api/auth/refresh
 * Refresh an access token using a refresh token
 */
const refresh = catchAsync(async (req, res) => {
    const { refreshToken, clientId, clientSecret } = req.body;

    const tokens = await authService.refreshToken({
        refreshToken,
        clientId,
        clientSecret,
    });

    res.status(200).json({
        success: true,
        message: "Token refreshed",
        data: tokens,
    });
});

/**
 * POST /api/auth/verify
 * Verify an access token or refresh token (OIDC Introspection)
 */
const verify = catchAsync(async (req, res) => {
    const { token, clientId, clientSecret, tokenTypeHint } = req.body;

    const result = await authService.verifyToken({
        token,
        clientId,
        clientSecret,
        tokenTypeHint,
    });

    res.status(200).json({
        success: true,
        message: result.active ? "Token is valid" : "Token is invalid",
        data: result,
    });
});

module.exports = { authorize, token, refresh, verify };

