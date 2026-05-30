const { pageHead, bgOrbs, scripts } = require('../shared/layout');
const { shieldIcon, escapeHtml } = require('../shared/components');

/**
 * Render the reset password page
 */
const renderResetPasswordPage = (uid, token, clientId, options = {}) => {
    const { 
        error = null, 
        message = null,
        clientName = "Auth Server",
        logoUrl = null
    } = options;

    return `
${pageHead("Reset Password")}
<body>
    ${bgOrbs()}
    <div class="card">
        <div class="card-header">
            <div class="logo">
                ${logoUrl ? `<img src="${logoUrl}" alt="${clientName}" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover;" />` : shieldIcon}
            </div>
            <h1>Reset Password</h1>
            <p>${message ? "Success!" : "Enter your new password below."}</p>
        </div>

        ${error ? `<div class="error-box">${escapeHtml(error)}</div>` : ""}
        ${message ? `<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success-color); color: var(--success-color); padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.95rem;">${escapeHtml(message)}</div>` : ""}

        ${!message ? `
        <form method="POST" action="/oauth2/v1/interaction/${uid}/reset-password">
            <input type="hidden" name="token" value="${escapeHtml(token)}" />
            <input type="hidden" name="client_id" value="${escapeHtml(clientId || '')}" />
            <div class="form-group">
                <label for="password">New Password</label>
                <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="new-password" />
            </div>
            <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="••••••••" required autocomplete="new-password" />
            </div>
            <button type="submit" class="btn-primary">Reset Password</button>
        </form>
        ` : ''}

        <div class="card-footer">
            <a href="/oauth2/v1/interaction/${uid}/login">Back to Sign in</a>
        </div>
    </div>
    ${scripts()}
</body>
</html>`;
};

module.exports = { renderResetPasswordPage };
