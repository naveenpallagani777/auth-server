const Joi = require("joi");

const authorizeSchema = Joi.object({
    clientId: Joi.string().required().messages({
        "any.required": "Client ID is required",
    }),
    redirectUrl: Joi.string().uri().required().messages({
        "string.uri": "Redirect URL must be a valid URL",
        "any.required": "Redirect URL is required",
    }),
    scope: Joi.string().default("openid email profile"),
    state: Joi.string().optional(),
    responseType: Joi.string().valid("code", "id_token", "code id_token").default("code"),
    codeChallenge: Joi.string().optional(),
    codeChallengeMethod: Joi.string().valid("S256").optional(),
});

const tokenSchema = Joi.object({
    code: Joi.string().required().messages({
        "any.required": "Authorization code is required",
    }),
    clientId: Joi.string().required().messages({
        "any.required": "Client ID is required",
    }),
    clientSecret: Joi.string().required().messages({
        "any.required": "Client secret is required",
    }),
    redirectUrl: Joi.string().uri().required().messages({
        "string.uri": "Redirect URL must be a valid URL",
        "any.required": "Redirect URL is required",
    }),
    codeVerifier: Joi.string().optional(),
});

const refreshSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        "any.required": "Refresh token is required",
    }),
    clientId: Joi.string().required().messages({
        "any.required": "Client ID is required",
    }),
    clientSecret: Joi.string().required().messages({
        "any.required": "Client secret is required",
    }),
});

const verifySchema = Joi.object({
    token: Joi.string().required().messages({
        "any.required": "Token is required",
    }),
    clientId: Joi.string().required().messages({
        "any.required": "Client ID is required",
    }),
    clientSecret: Joi.string().required().messages({
        "any.required": "Client secret is required",
    }),
    tokenTypeHint: Joi.string().valid("access_token", "refresh_token").optional(),
});

module.exports = {
    authorizeSchema,
    tokenSchema,
    refreshSchema,
    verifySchema,
};
