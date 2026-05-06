const fetch = require("node-fetch");
const env = require("../config/env");

/**
 * Sends an email using Brevo's v3 Transactional API
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - Email HTML content
 * @returns {Promise<boolean>} - Success status
 */
const sendEmail = async ({ to, subject, htmlContent }) => {
    if (!env.BREVO_API_KEY) {
        console.warn("[Email Service] BREVO_API_KEY is not configured. Email will not be sent.");
        return false;
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": env.BREVO_API_KEY,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sender: {
                    name: env.BREVO_SENDER_NAME,
                    email: env.BREVO_SENDER_EMAIL,
                },
                to: [
                    { email: to }
                ],
                subject,
                htmlContent,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("[Email Service] Brevo API Error:", data);
            return false;
        }

        return true;
    } catch (error) {
        console.error("[Email Service] Failed to send email:", error.message);
        return false;
    }
};

module.exports = {
    sendEmail,
};
