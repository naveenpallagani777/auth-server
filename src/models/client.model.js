const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../helpers/crypto");

const clientSchema = new mongoose.Schema(
    {
        clientId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        clientSecret: {
            type: String,
            required: true,
            set: encrypt,
            get: decrypt,
        },
        clientName: {
            type: String,
            required: true,
            unique: true,
        },
        redirectUrls: {
            type: [String],
            required: true,
        },
        postLogoutRedirectUrls: {
            type: [String],
            default: [],
        },
        grantTypes: {
            type: [String],
            default: ["authorization_code", "refresh_token"],
        },
        responseTypes: {
            type: [String],
            default: ["code"],
        },
        scope: {
            type: String,
            default: "openid email profile offline_access",
        },
        tokenEndpointAuthMethod: {
            type: String,
            enum: ["client_secret_basic", "client_secret_post", "none"],
            default: "client_secret_basic",
        },
        applicationType: {
            type: String,
            enum: ["web", "native"],
            default: "web",
        },
        logoUrl: {
            type: String,
            default: null,
        },
        clientUrl: {
            type: String,
            default: null,
        },
        policyUrl: {
            type: String,
            default: null,
        },
        tosUrl: {
            type: String,
            default: null,
        },
        active: {
            type: Boolean,
            default: true,
        },
        authMethod: {
            type: String,
            enum: [
                "EMAIL_PASSWORD",
                "PHONE_PASSWORD",
                "EMAIL_OTP",
                "PHONE_OTP",
                "EMAIL_PHONE_PASSWORD_OTP",
                "EMAIL_PASSWORD_OTP",
                "PHONE_PASSWORD_OTP",
            ],
            default: "EMAIL_PASSWORD",
        },
        accessTokenTtl: {
            type: Number,
            default: 3600, // 1 hour
        },
        idTokenTtl: {
            type: Number,
            default: 3600, // 1 hour
        },
        refreshTokenTtl: {
            type: Number,
            default: 1209600, // 14 days
        },
        authCodeTtl: {
            type: Number,
            default: 600, // 10 minutes
        },
        requireTOTP: {
            type: Boolean,
            default: false,
        },
        allowedRegistrationDomains: {
            type: [String],
            default: [],
        },
        socialLogins: {
            google: {
                enabled: { type: Boolean, default: false },
                clientId: { type: String, default: "" },
                clientSecret: { type: String, default: "", set: encrypt, get: decrypt },
            },
            microsoft: {
                enabled: { type: Boolean, default: false },
                clientId: { type: String, default: "" },
                clientSecret: { type: String, default: "", set: encrypt, get: decrypt },
            },
        },
    },
    { 
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    },
);

/**
 * Convert to OIDC-provider compatible client metadata format
 */
clientSchema.methods.toOIDCClient = function () {
    return {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        client_name: this.clientName,
        redirect_uris: this.redirectUrls,
        post_logout_redirect_uris: this.postLogoutRedirectUrls,
        grant_types: this.grantTypes,
        response_types: this.responseTypes,
        scope: this.scope,
        token_endpoint_auth_method: this.tokenEndpointAuthMethod,
        application_type: this.applicationType,
        logo_uri: this.logoUrl,
        client_uri: this.clientUrl,
        policy_uri: this.policyUrl,
        tos_uri: this.tosUrl,
        access_token_ttl: this.accessTokenTtl,
        id_token_ttl: this.idTokenTtl,
        refresh_token_ttl: this.refreshTokenTtl,
        auth_code_ttl: this.authCodeTtl,
    };
};

const ClientModel = mongoose.model("Client", clientSchema);

module.exports = ClientModel;
