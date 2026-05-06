const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const JWKS_PATH = path.resolve(__dirname, "../../jwks.json");

/**
 * Generate an RSA key pair and return as JWK Set
 */
const generateJWKS = () => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
    });

    // Export as JWK
    const jwk = privateKey.export({ format: "jwk" });

    // Add required metadata
    jwk.use = "sig";
    jwk.alg = "RS256";
    jwk.kid = crypto.randomUUID();

    return { keys: [jwk] };
};

/**
 * Load JWKS from file, or generate and save if it doesn't exist
 */
const loadOrGenerateJWKS = () => {
    // If JWKS file exists, load it
    if (fs.existsSync(JWKS_PATH)) {
        const raw = fs.readFileSync(JWKS_PATH, "utf-8");
        console.log("🔐 JWKS loaded from jwks.json");
        return JSON.parse(raw);
    }

    // Generate new JWKS
    const jwks = generateJWKS();
    fs.writeFileSync(JWKS_PATH, JSON.stringify(jwks, null, 2), "utf-8");
    console.log("🔐 JWKS generated and saved to jwks.json");

    return jwks;
};

module.exports = { loadOrGenerateJWKS, generateJWKS, JWKS_PATH };
