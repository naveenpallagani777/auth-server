/**
 * Generates HTML for the TOTP Setup email
 * @param {string} secret - The TOTP secret
 * @param {string} otpauthUrl - The otpauth:// URL for the QR code
 * @param {string} clientName - The name of the client/app requesting auth
 * @returns {string} - HTML content
 */
const renderTOTPSetupEmail = (secret, otpauthUrl, clientName) => {
    // We use a public, reliable API to generate the QR code image on the fly
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpauthUrl)}&margin=10`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Set Up Two-Factor Authentication</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #10b981; padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 40px 30px; text-align: center; color: #374151; }
        .content p { font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #4b5563; }
        .qr-code { display: block; margin: 0 auto 24px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; background-color: #ffffff; }
        .secret-box { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; font-size: 20px; font-family: monospace; letter-spacing: 2px; color: #111827; margin: 0 auto 24px; max-width: 350px; word-break: break-all; }
        .footer { padding: 20px 30px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Two-Factor Authentication Setup</h1>
        </div>
        <div class="content">
            <p>You requested to set up Two-Factor Authentication (2FA) for <strong>${clientName}</strong>.</p>
            <p>Please scan the QR code below using your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).</p>
            
            <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" width="250" height="250" />
            
            <p>If you can't scan the barcode, you can manually enter this secret key into your app:</p>
            <div class="secret-box">${secret}</div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Once you have added the account to your app, enter the 6-digit code on the website to verify the setup.</p>
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
    renderTOTPSetupEmail
};
