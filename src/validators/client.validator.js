const Joi = require("joi");

const VALID_GRANT_TYPES = [
    "authorization_code",
    "refresh_token",
    "client_credentials",
    "implicit",
];

const VALID_RESPONSE_TYPES = ["code", "id_token", "code id_token", "none"];

const VALID_AUTH_METHODS = ["client_secret_basic", "client_secret_post", "none"];

const VALID_APP_TYPES = ["web", "native"];

const VALID_CLIENT_AUTH_METHODS = [
    "EMAIL_PASSWORD",
    "PHONE_PASSWORD",
    "EMAIL_OTP",
    "PHONE_OTP",
    "EMAIL_PHONE_PASSWORD_OTP",
    "EMAIL_PASSWORD_OTP",
    "PHONE_PASSWORD_OTP",
];

const socialLoginSchema = Joi.object({
    enabled: Joi.boolean().default(false),
    clientId: Joi.string().allow("", null).default(""),
    clientSecret: Joi.string().allow("", null).default(""),
});

const socialLoginsSchema = Joi.object({
    google: socialLoginSchema.default({ enabled: false, clientId: "", clientSecret: "" }),
    microsoft: socialLoginSchema.default({ enabled: false, clientId: "", clientSecret: "" }),
}).default({
    google: { enabled: false, clientId: "", clientSecret: "" },
    microsoft: { enabled: false, clientId: "", clientSecret: "" }
});

const createClientSchema = Joi.object({
    clientName: Joi.string().min(2).max(200).required().messages({
        "string.min": "Client name must be at least 2 characters",
        "string.max": "Client name must not exceed 200 characters",
        "any.required": "Client name is required",
    }),
    redirectUrls: Joi.array().items(Joi.string().uri()).min(1).required().messages({
        "array.min": "At least one redirect URL is required",
        "any.required": "Redirect URLs are required",
        "string.uri": "Each redirect URL must be a valid URL",
    }),
    postLogoutRedirectUrls: Joi.array().items(Joi.string().uri()).default([]).messages({
        "string.uri": "Each post-logout redirect URL must be a valid URL",
    }),
    grantTypes: Joi.array()
        .items(Joi.string().valid(...VALID_GRANT_TYPES))
        .default(["authorization_code", "refresh_token"])
        .messages({
            "any.only": `Grant type must be one of: ${VALID_GRANT_TYPES.join(", ")}`,
        }),
    responseTypes: Joi.array()
        .items(Joi.string().valid(...VALID_RESPONSE_TYPES))
        .default(["code"])
        .messages({
            "any.only": `Response type must be one of: ${VALID_RESPONSE_TYPES.join(", ")}`,
        }),
    scope: Joi.string().default("openid email profile offline_access"),
    tokenEndpointAuthMethod: Joi.string()
        .valid(...VALID_AUTH_METHODS)
        .default("client_secret_basic")
        .messages({
            "any.only": `Token endpoint auth method must be one of: ${VALID_AUTH_METHODS.join(", ")}`,
        }),
    applicationType: Joi.string()
        .valid(...VALID_APP_TYPES)
        .default("web")
        .messages({
            "any.only": `Application type must be one of: ${VALID_APP_TYPES.join(", ")}`,
        }),
    logoUrl: Joi.string().uri().allow(null, "").default(null),
    clientUrl: Joi.string().uri().allow(null, "").default(null),
    policyUrl: Joi.string().uri().allow(null, "").default(null),
    tosUrl: Joi.string().uri().allow(null, "").default(null),
    accessTokenTtl: Joi.number().integer().min(60).default(3600),
    idTokenTtl: Joi.number().integer().min(60).default(3600),
    refreshTokenTtl: Joi.number().integer().min(60).default(1209600),
    authCodeTtl: Joi.number().integer().min(60).default(600),
    authMethod: Joi.string()
        .valid(...VALID_CLIENT_AUTH_METHODS)
        .default("EMAIL_PASSWORD")
        .messages({
            "any.only": `Client Auth Method must be one of: ${VALID_CLIENT_AUTH_METHODS.join(", ")}`,
        }),
    requireTOTP: Joi.boolean().default(false),
    allowedRegistrationDomains: Joi.array().items(Joi.string()).default([]),
    socialLogins: socialLoginsSchema,
});

const updateClientSchema = Joi.object({
    redirectUrls: Joi.array().items(Joi.string().uri()).min(1).messages({
        "array.min": "At least one redirect URL is required",
        "string.uri": "Each redirect URL must be a valid URL",
    }),
    postLogoutRedirectUrls: Joi.array().items(Joi.string().uri()).messages({
        "string.uri": "Each post-logout redirect URL must be a valid URL",
    }),
    grantTypes: Joi.array()
        .items(Joi.string().valid(...VALID_GRANT_TYPES))
        .messages({
            "any.only": `Grant type must be one of: ${VALID_GRANT_TYPES.join(", ")}`,
        }),
    responseTypes: Joi.array()
        .items(Joi.string().valid(...VALID_RESPONSE_TYPES))
        .messages({
            "any.only": `Response type must be one of: ${VALID_RESPONSE_TYPES.join(", ")}`,
        }),
    scope: Joi.string(),
    tokenEndpointAuthMethod: Joi.string()
        .valid(...VALID_AUTH_METHODS)
        .messages({
            "any.only": `Token endpoint auth method must be one of: ${VALID_AUTH_METHODS.join(", ")}`,
        }),
    applicationType: Joi.string()
        .valid(...VALID_APP_TYPES)
        .messages({
            "any.only": `Application type must be one of: ${VALID_APP_TYPES.join(", ")}`,
        }),
    logoUrl: Joi.string().uri().allow(null, ""),
    clientUrl: Joi.string().uri().allow(null, ""),
    policyUrl: Joi.string().uri().allow(null, ""),
    tosUrl: Joi.string().uri().allow(null, ""),
    active: Joi.boolean(),
    accessTokenTtl: Joi.number().integer().min(60),
    idTokenTtl: Joi.number().integer().min(60),
    refreshTokenTtl: Joi.number().integer().min(60),
    authCodeTtl: Joi.number().integer().min(60),
    authMethod: Joi.string()
        .valid(...VALID_CLIENT_AUTH_METHODS)
        .messages({
            "any.only": `Client Auth Method must be one of: ${VALID_CLIENT_AUTH_METHODS.join(", ")}`,
        }),
    requireTOTP: Joi.boolean(),
    allowedRegistrationDomains: Joi.array().items(Joi.string()),
    socialLogins: Joi.object({
        google: Joi.object({
            enabled: Joi.boolean(),
            clientId: Joi.string().allow("", null),
            clientSecret: Joi.string().allow("", null),
        }),
        microsoft: Joi.object({
            enabled: Joi.boolean(),
            clientId: Joi.string().allow("", null),
            clientSecret: Joi.string().allow("", null),
        }),
    }),
})
    .min(1)
    .messages({
        "object.min": "At least one field must be provided for update",
    });

module.exports = {
    createClientSchema,
    updateClientSchema,
    VALID_GRANT_TYPES,
    VALID_RESPONSE_TYPES,
    VALID_AUTH_METHODS,
    VALID_APP_TYPES,
    VALID_CLIENT_AUTH_METHODS,
};
