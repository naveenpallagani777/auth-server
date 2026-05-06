const { pageHead, bgOrbs, scripts } = require('./layout');
const { shieldIcon, escapeHtml } = require('./components');

/**
 * Render the TOTP (2FA) page
 */
const renderTOTPPage = (uid, options = {}) => {
    const { 
        error = null, 
        setup = false, 
        secret = "", 
        email = "",
        phoneCode = "",
        phoneNumber = "",
        clientName = "Auth Server",
        logoUrl = null
    } = options;

    let contentHtml = "";
    let title = "Two-Factor Auth";

    if (setup) {
        title = "Setup Authenticator";
        contentHtml = `
            <div style="text-align: left; margin-bottom: 1.5rem;">
                <p style="font-size: 0.875rem; color: rgba(255,255,255,0.6); margin-bottom: 1rem;">
                    Check your server console for the setup QR code and enter the generated verification code below.
                </p>
            </div>
            <input type="hidden" name="totpSecret" value="${secret}" />
        `;
    } else {
        contentHtml = `
            <p style="font-size: 0.875rem; color: rgba(255,255,255,0.6); margin-bottom: 1.5rem;">
                Enter the 6-digit code from your authenticator app.
            </p>
        `;
    }

    return `
${pageHead(title)}
<body>
    ${bgOrbs()}
    <div class="card">
        <div class="card-header">
            <div class="logo">
                ${logoUrl ? `<img src="${logoUrl}" alt="${clientName}" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover;" />` : shieldIcon}
            </div>
            <h1>${title}</h1>
            <p>${setup ? "Enhance your security" : `Verify identity for ${clientName}`}</p>
        </div>

        ${error ? `<div class="error-box">${escapeHtml(error)}</div>` : ""}

        <form method="POST" action="/oauth2/v1/interaction/${uid}/login">
            <input type="hidden" name="step" value="TOTP" />
            <input type="hidden" name="email" value="${escapeHtml(email)}" />
            <input type="hidden" name="phoneCode" value="${escapeHtml(phoneCode)}" />
            <input type="hidden" name="phoneNumber" value="${escapeHtml(phoneNumber)}" />
            ${contentHtml}
            
            <div class="form-group">
                <label for="totpCode">Verification Code</label>
                <input type="text" id="totpCode" name="totpCode" placeholder="000000" required autocomplete="one-time-code" inputmode="numeric" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 4px;" />
            </div>

            <button type="submit" class="btn-primary">Verify</button>
        </form>

    </div>
    ${scripts()}
</body>
</html>`;
};

module.exports = { renderTOTPPage };
