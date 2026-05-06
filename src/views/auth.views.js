/**
 * Main entry point for auth views, modularized for better maintainability.
 */

const { renderLoginPage } = require('./login/login.view');
const { renderSignupPage } = require('./signup/signup.view');
const { renderTOTPPage } = require('./shared/totp.view');

module.exports = {
    renderLoginPage,
    renderSignupPage,
    renderTOTPPage
};
