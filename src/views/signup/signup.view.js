const { pageHead, bgOrbs, scripts } = require('../shared/layout');
const { shieldIcon, phoneSelectHtml, escapeHtml } = require('../shared/components');

/**
 * Render the signup page
 */
const renderSignupPage = (uid, options = {}) => {
    // Legacy support for passing (uid, error) instead of options object
    if (typeof options === "string") {
        options = { error: options };
    }
    const { 
        error = null, 
        authMethod = "EMAIL_PASSWORD",
        clientName = "Auth Server",
        logoUrl = null,
        socialLogins = null
    } = options;

    const isEmail = authMethod.includes("EMAIL");
    const isPhone = authMethod.includes("PHONE");
    const isPassword = authMethod.includes("PASSWORD");

    let fieldsHtml = `
        <div class="form-group">
            <label for="name">Full name</label>
            <input type="text" id="name" name="name" placeholder="Jane Doe" required autocomplete="name" />
        </div>
    `;

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

    if (isPassword) {
        fieldsHtml += `
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" placeholder="Min. 8 characters" required minlength="8" autocomplete="new-password" />
            </div>
        `;
    }

    let socialHtml = "";
    if (socialLogins) {
        let buttons = [];
        if (socialLogins.google && socialLogins.google.enabled) {
            buttons.push(`<a href="/oauth2/v1/interaction/${uid}/login/google" class="btn-social btn-google">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                Continue with Google
            </a>`);
        }
        if (socialLogins.microsoft && socialLogins.microsoft.enabled) {
            buttons.push(`<a href="/oauth2/v1/interaction/${uid}/login/microsoft" class="btn-social btn-microsoft">
                <svg width="18" height="18" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
                Continue with Microsoft
            </a>`);
        }

        if (buttons.length > 0) {
            socialHtml = `
                <div class="divider">
                    <span>or continue with</span>
                </div>
                <div class="social-buttons">
                    ${buttons.join("")}
                </div>
            `;
        }
    }

    return `
${pageHead("Create Account")}
<body>
    ${bgOrbs()}
    <div class="card">
        <div class="card-header">
            <div class="logo">
                ${logoUrl ? `<img src="${logoUrl}" alt="${clientName}" style="width: 100%; height: 100%; border-radius: inherit; object-fit: cover;" />` : shieldIcon}
            </div>
            <h1>Join ${clientName}</h1>
            <p>Get started with your new account</p>
        </div>

        ${error ? `<div class="error-box">${escapeHtml(error)}</div>` : ""}

        <form method="POST" action="/oauth2/v1/interaction/${uid}/signup">
            ${fieldsHtml}
            <button type="submit" class="btn-primary">Create account</button>
        </form>

        ${socialHtml}

        <div class="card-footer">
            Already have an account? <a href="/oauth2/v1/interaction/${uid}/login">Sign in</a>
        </div>
    </div>
    ${scripts()}
</body>
</html>`;
};

module.exports = { renderSignupPage };
