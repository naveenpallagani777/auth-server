/**
 * Generates HTML for the OTP email
 * @param {string} otp - The one-time password
 * @param {string} clientName - The name of the client/app requesting auth
 * @returns {string} - HTML content
 */
const renderOTPEmail = (otp, clientName) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #4f46e5; padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 40px 30px; text-align: center; color: #374151; }
        .content p { font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #4b5563; }
        .otp-box { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #111827; margin: 0 auto 24px; max-width: 300px; }
        .footer { padding: 20px 30px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${clientName}</h1>
        </div>
        <div class="content">
            <p>You requested a one-time password to sign in. Please use the code below to complete your login.</p>
            <div class="otp-box">${otp}</div>
            <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} ${clientName}. All rights reserved.
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = {
    renderOTPEmail
};
