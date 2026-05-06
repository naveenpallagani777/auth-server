const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";
// The key must be exactly 32 bytes (256 bits)
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, 'utf8').subarray(0, 32); 

// Fallback to ensuring it's 32 bytes if the env var was too short
const KEY = ENCRYPTION_KEY.length === 32 ? ENCRYPTION_KEY : crypto.createHash('sha256').update(String(env.ENCRYPTION_KEY)).digest('base64').substring(0, 32);

/**
 * Encrypt a plain text string
 * @param {string} text 
 * @returns {string} iv:authTag:encryptedData
 */
const encrypt = (text) => {
    if (!text) return text;
    const iv = crypto.randomBytes(12); // 12 bytes is recommended for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

/**
 * Decrypt an encrypted string (iv:authTag:encryptedData)
 * @param {string} text 
 * @returns {string}
 */
const decrypt = (text) => {
    if (!text || !text.includes(":")) return text;
    try {
        const parts = text.split(":");
        if (parts.length !== 3) return text; // Fallback if format is not iv:authTag:encrypted

        const iv = Buffer.from(parts[0], "hex");
        const authTag = Buffer.from(parts[1], "hex");
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (err) {
        console.error("Decryption failed:", err.message);
        return text; // Return original text if decryption fails (e.g. key mismatch or plain text)
    }
};

module.exports = {
    encrypt,
    decrypt,
};
