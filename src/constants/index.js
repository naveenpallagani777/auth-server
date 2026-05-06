/**
 * Constants used across the auth server
 */

const USER_ROLES = {
    USER: "user",
    ADMIN: "admin",
};

const GRANT_TYPES = {
    AUTHORIZATION_CODE: "authorization_code",
    REFRESH_TOKEN: "refresh_token",
    CLIENT_CREDENTIALS: "client_credentials",
    IMPLICIT: "implicit",
};

const RESPONSE_TYPES = {
    CODE: "code",
    ID_TOKEN: "id_token",
    CODE_ID_TOKEN: "code id_token",
    NONE: "none",
};

const TOKEN_ENDPOINT_AUTH_METHODS = {
    CLIENT_SECRET_BASIC: "client_secret_basic",
    CLIENT_SECRET_POST: "client_secret_post",
    NONE: "none",
};

const APPLICATION_TYPES = {
    WEB: "web",
    NATIVE: "native",
};

module.exports = {
    USER_ROLES,
    GRANT_TYPES,
    RESPONSE_TYPES,
    TOKEN_ENDPOINT_AUTH_METHODS,
    APPLICATION_TYPES,
};
