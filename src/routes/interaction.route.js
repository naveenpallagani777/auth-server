const express = require("express");
const router = express.Router();
const { buildInteractionController } = require("../controllers/interaction.controller");

/**
 * Build interaction routes that use the OIDC provider instance
 * @param {import("oidc-provider")} provider - The OIDC provider instance
 */
const buildInteractionRoutes = (provider) => {
    const interactionController = buildInteractionController(provider);

    /**
     * Social Login Callbacks
     * Must be placed before /:uid to prevent 'callback' from being treated as a uid
     */
    router.get("/callback/google", interactionController.googleCallback);
    router.get("/callback/microsoft", interactionController.microsoftCallback);

    /**
     * GET /interaction/:uid
     * Redirects the base interaction URL to the login page.
     * This ensures the interaction cookie path covers both /login and /signup.
     */
    router.get("/:uid", interactionController.redirectLogin);

    /**
     * GET /interaction/:uid/login/google
     * Initiate Google Login
     */
    router.get("/:uid/login/google", interactionController.getGoogleLogin);

    /**
     * GET /interaction/:uid/login/microsoft
     * Initiate Microsoft Login
     */
    router.get("/:uid/login/microsoft", interactionController.getMicrosoftLogin);

    /**
     * GET /interaction/:uid/login
     * Renders the login page for the interaction (HTML for browsers, JSON for API clients)
     */
    router.get("/:uid/login", interactionController.getLogin);

    /**
     * GET /interaction/:uid/signup
     * Renders the signup page for the interaction
     */
    router.get("/:uid/signup", interactionController.getSignup);

    /**
     * POST /interaction/:uid/login
     * Submit login credentials to complete the login interaction
     */
    router.post("/:uid/login", interactionController.postLogin);

    /**
     * POST /interaction/:uid/signup
     * Register a new account and complete the login interaction in one step
     */
    router.post("/:uid/signup", interactionController.postSignup);

    /**
     * GET /interaction/:uid/forgot-password
     * Render the forgot password page
     */
    router.get("/:uid/forgot-password", interactionController.getForgotPassword);

    /**
     * POST /interaction/:uid/forgot-password
     * Process the forgot password request
     */
    router.post("/:uid/forgot-password", interactionController.postForgotPassword);

    /**
     * GET /interaction/:uid/reset-password
     * Render the reset password page (requires token)
     */
    router.get("/:uid/reset-password", interactionController.getResetPassword);

    /**
     * POST /interaction/:uid/reset-password
     * Process the reset password request
     */
    router.post("/:uid/reset-password", interactionController.postResetPassword);

    /**
     * POST /interaction/:uid/confirm
     * Submit consent to complete the consent interaction
     */
    router.post("/:uid/confirm", interactionController.confirmConsent);

    /**
     * DELETE /interaction/:uid
     * Abort an interaction (user cancelled)
     */
    router.delete("/:uid", interactionController.abortInteraction);

    return router;
};

module.exports = { buildInteractionRoutes };
