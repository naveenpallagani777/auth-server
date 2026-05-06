const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { authorizeSchema, tokenSchema, refreshSchema, verifySchema } = require("../validators/auth.validator");

// Get OIDC authorization URL (redirect user here to login)
router.post("/authorize", validate(authorizeSchema), authController.authorize);

// Exchange authorization code for tokens
router.post("/token", validate(tokenSchema), authController.token);

// Refresh an access token
router.post("/refresh", validate(refreshSchema), authController.refresh);

// Verify an access token or refresh token
router.post("/verify", validate(verifySchema), authController.verify);

module.exports = router;
