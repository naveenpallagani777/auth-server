/**
 * Main entry point for auth views, modularized for better maintainability.
 */

const { renderLoginPage } = require('./login/login.view');
const { renderSignupPage } = require('./signup/signup.view');
const { renderTOTPPage } = require('./shared/totp.view');
const { renderForgotPasswordPage } = require('./login/forgot-password.view');
const { renderResetPasswordPage } = require('./login/reset-password.view');

module.exports = {
    renderLoginPage,
    renderSignupPage,
    renderTOTPPage,
    renderForgotPasswordPage,
    renderResetPasswordPage
};
