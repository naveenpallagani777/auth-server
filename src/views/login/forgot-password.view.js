const { pageHead, bgOrbs, scripts } = require('../shared/layout');
const { shieldIcon, phoneSelectHtml, escapeHtml } = require('../shared/components');

/**
 * Render the forgot password page
 */
const renderForgotPasswordPage = (uid, options = {}) => {
    const { 
        error = null, 
        message = null,
        authMethod = "EMAIL_PASSWORD", 
        clientName = "Auth Server",
        logoUrl = null
    } = options;

    const isEmail = authMethod.includes("EMAIL");
    const isPhone = authMethod.includes("PHONE");

    let fieldsHtml = "";

    if (isEmail && isPhone) {
        fieldsHtml += `
            <div class="form-group" id="unified-container">
                <label id="unified-label" for="unified-input">Email or Phone Number</label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <div style="display: none; width: auto;" id="phoneCodeWrap">${phoneSelectHtml('phoneCode')}</div>
                    <input type="text" id="unified-input" name="email" placeholder="you@example.com or 9876543210" required style="flex: 1;" />
                </div>
                <div id="phone-hint" class="phone-hint"></div>
            </div>
        `;
    } else if (isEmail) {
        fieldsHtml += `
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" placeholder="you@example.com" required autocomplete="email" />
            </div>
        `;
    } else if (isPhone) {
        fieldsHtml += `
            <div class="form-group">
                <label>Phone Number</label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    ${phoneSelectHtml('phoneCode')}
                    <input type="tel" name="phoneNumber" placeholder="9876543210" required inputmode="numeric" style="flex: 1;" />
                </div>
                <div id="phone-hint" class="phone-hint"></div>
            </div>
        `;
    }

    return `
${pageHead("Forgot Password")}
<body>
    ${bgOrbs()}
    <div class="card">
        <div class="card-header">
            <div class="logo">
                ${logoUrl ? `<img src="${logoUrl}" alt="${clientName}" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover;" />` : shieldIcon}
            </div>
            <h1>Forgot Password</h1>
            <p>Enter your account identifier to receive a password reset link.</p>
        </div>

        ${error ? `<div class="error-box">${escapeHtml(error)}</div>` : ""}
        ${message ? `<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success-color); color: var(--success-color); padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.95rem;">${escapeHtml(message)}</div>` : ""}

        ${!message ? `
        <form method="POST" action="/oauth2/v1/interaction/${uid}/forgot-password">
            ${fieldsHtml}
            <button type="submit" class="btn-primary">Send Reset Link</button>
        </form>
        ` : ''}

        <div class="card-footer">
            Remembered your password? <a href="/oauth2/v1/interaction/${uid}/login">Sign in</a>
        </div>
    </div>
    ${scripts()}
</body>
</html>`;
};

module.exports = { renderForgotPasswordPage };
