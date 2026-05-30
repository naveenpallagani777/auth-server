/**
 * Renders the HTML for the forgot password email
 * @param {string} resetLink - The password reset link
 * @param {string} clientName - The name of the client application
 * @returns {string} HTML content
 */
const renderForgotPasswordEmail = (resetLink, clientName = "Auth Server") => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset - ${clientName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background-color: #f9f9f9; border-radius: 8px; padding: 30px; text-align: center; border: 1px solid #eaeaea; }
        .logo { font-size: 24px; font-weight: bold; color: #4F46E5; margin-bottom: 20px; }
        .link-container { margin: 30px 0; }
        .reset-button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">${clientName}</div>
        <h2>Password Reset Request</h2>
        <p>We received a request to reset the password for your account.</p>
        <div class="link-container">
            <a href="${resetLink}" class="reset-button">Reset My Password</a>
        </div>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>This link will expire in 15 minutes.</p>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${clientName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = { renderForgotPasswordEmail };
