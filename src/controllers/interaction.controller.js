const { AppError } = require("../helpers/AppError");
const { renderLoginPage, renderSignupPage, renderTOTPPage, renderForgotPasswordPage, renderResetPasswordPage } = require("../views/auth.views");
const { getClientInfo, processLoginStep, processSignup, processGoogleCallback, processMicrosoftCallback, processForgotPassword, processResetPassword } = require("../services/interaction.service");
const env = require("../config/env");

const buildInteractionController = (provider) => {
    const redirectLogin = (req, res) => {
        res.redirect(`/oauth2/v1/interaction/${req.params.uid}/login`);
    };

    const getLogin = async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { uid, prompt, params, session } = interactionDetails;

            console.log(`[Interaction] getLogin called for uid=${uid}, prompt=${prompt.name}`);

            if (prompt.name === "consent") {
                let grant;
                if (interactionDetails.grantId) {
                    grant = await provider.Grant.find(interactionDetails.grantId);
                } else {
                    grant = new provider.Grant({
                        accountId: session.accountId,
                        clientId: params.client_id,
                    });
                }

                if (prompt.details.missingOIDCScope) {
                    grant.addOIDCScope(prompt.details.missingOIDCScope.join(" "));
                }
                if (prompt.details.missingOIDCClaims) {
                    grant.addOIDCClaims(prompt.details.missingOIDCClaims);
                }
                if (prompt.details.missingResourceScopes) {
                    for (const [indicator, scopes] of Object.entries(prompt.details.missingResourceScopes)) {
                        grant.addResourceScope(indicator, scopes.join(" "));
                    }
                }

                const grantId = await grant.save();
                const redirectTo = await provider.interactionResult(
                    req,
                    res,
                    { consent: { grantId } },
                    { mergeWithLastSubmission: true }
                );
                return res.redirect(redirectTo);
            }

            if (prompt.name !== "login") {
                console.error(`[Interaction] Unexpected prompt: ${prompt.name}`);
                throw new AppError(`The authentication server received an invalid or unexpected prompt type: ${prompt.name}. Please restart the login process.`, 400);
            }

            if (req.accepts("html")) {
                const { authMethod, clientName, logoUrl, socialLogins } = await getClientInfo(params.client_id);
                return res.send(renderLoginPage(uid, { authMethod, clientName, logoUrl, socialLogins }));
            }

            res.status(200).json({
                success: true,
                data: {
                    uid,
                    prompt: prompt.name,
                    promptDetails: prompt.details,
                    params: {
                        client_id: params.client_id,
                        redirect_uri: params.redirect_uri,
                        scope: params.scope,
                        response_type: params.response_type,
                        state: params.state,
                    },
                    session: session ? { accountId: session.accountId } : null,
                },
            });
        } catch (err) {
            next(err);
        }
    };

    const getSignup = async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { authMethod, clientName, logoUrl, socialLogins } = await getClientInfo(interactionDetails.params.client_id);

            res.send(renderSignupPage(req.params.uid, { authMethod, clientName, logoUrl, socialLogins }));
        } catch (err) {
            next(err);
        }
    };

    const postLogin = async (req, res, next) => {
        const { uid } = req.params;
        const isHtml = !req.is("application/json");
        let interactionDetails;

        try {
            interactionDetails = await provider.interactionDetails(req, res);

            if (interactionDetails.prompt.name !== "login") {
                throw new AppError("This authentication session is invalid or does not require a login step. Please restart the process.", 400);
            }

            const result = await processLoginStep(interactionDetails.params.client_id, req.body);

            if (result.action === "OTP_REQUIRED") {
                if (isHtml) {
                    return res.send(renderLoginPage(uid, result.data));
                } else {
                    return res.status(200).json({ success: true, message: "OTP sent", data: result.data });
                }
            } else if (result.action === "TOTP_REQUIRED") {
                if (isHtml) {
                    return res.send(renderTOTPPage(uid, result.data));
                } else {
                    return res.status(200).json({ success: true, message: "TOTP required", data: { step: "TOTP", ...result.data } });
                }
            } else if (result.action === "LOGIN_SUCCESS") {
                const redirectTo = await provider.interactionResult(req, res, { login: { accountId: result.accountId } }, { mergeWithLastSubmission: true });
                
                if (isHtml) return res.redirect(redirectTo);
                return res.status(200).json({ success: true, message: "Login successful", data: { redirectTo }});
            }

        } catch (err) {
            if (err.name === "SessionNotFound") {
                err.message = "Login session expired or already completed. If you are using a React app, ensure you are using window.location.href to follow the redirectTo URL, NOT fetch/axios.";
                err.statusCode = 400;
            }

            if (isHtml) {
                const { authMethod, clientName, logoUrl, socialLogins } = await getClientInfo(interactionDetails?.params?.client_id);
                return res.status(err.statusCode || 400).send(renderLoginPage(uid, { error: err.message, authMethod, clientName, logoUrl, socialLogins, step: req.body.step || "IDENTIFIER", email: req.body.email, phoneCode: req.body.phoneCode, phoneNumber: req.body.phoneNumber }));
            }
            next(err);
        }
    };

    const postSignup = async (req, res, next) => {
        const { uid } = req.params;
        const isHtml = !req.is("application/json");
        let interactionDetails;

        try {
            interactionDetails = await provider.interactionDetails(req, res);

            if (interactionDetails.prompt.name !== "login") {
                throw new AppError("This authentication session is invalid or does not require a signup step. Please restart the process.", 400);
            }

            const result = await processSignup(interactionDetails.params.client_id, req.body);

            if (result.action === "OTP_REQUIRED") {
                if (isHtml) {
                    return res.send(renderSignupPage(uid, result.data));
                } else {
                    return res.status(200).json({ success: true, message: "OTP sent", data: result.data });
                }
            } else if (result.action === "TOTP_REQUIRED") {
                if (isHtml) {
                    return res.send(renderTOTPPage(uid, result.data));
                } else {
                    return res.status(200).json({ success: true, message: "TOTP required", data: { step: "TOTP", ...result.data } });
                }
            } else if (result.action === "SIGNUP_SUCCESS") {
                const redirectTo = await provider.interactionResult(req, res, { login: { accountId: result.accountId } }, { mergeWithLastSubmission: true });
                
                if (isHtml) return res.redirect(redirectTo);
                res.status(201).json({ success: true, message: "Account created successfully", data: { redirectTo } });
            }

        } catch (err) {
            if (isHtml) {
                const { authMethod, clientName, logoUrl, socialLogins } = await getClientInfo(interactionDetails?.params?.client_id);
                return res.status(err.statusCode || 400).send(renderSignupPage(uid, { error: err.message, authMethod, clientName, logoUrl, socialLogins }));
            }
            next(err);
        }
    };

    const getForgotPassword = async (req, res, next) => {
        const { uid } = req.params;
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { authMethod, clientName, logoUrl } = await getClientInfo(interactionDetails.params.client_id);
            
            res.send(renderForgotPasswordPage(uid, { authMethod, clientName, logoUrl }));
        } catch (err) {
            next(err);
        }
    };

    const postForgotPassword = async (req, res, next) => {
        const { uid } = req.params;
        const isHtml = !req.is("application/json");
        let interactionDetails;

        try {
            interactionDetails = await provider.interactionDetails(req, res);
            await processForgotPassword(interactionDetails.params.client_id, req.body, uid, req.get('host'));

            if (isHtml) {
                const { authMethod, clientName, logoUrl } = await getClientInfo(interactionDetails.params.client_id);
                return res.send(renderForgotPasswordPage(uid, { 
                    message: "If the account exists, a password reset link has been sent.", 
                    authMethod, clientName, logoUrl 
                }));
            } else {
                return res.status(200).json({ success: true, message: "If the account exists, a password reset link has been sent." });
            }
        } catch (err) {
            if (isHtml) {
                const { authMethod, clientName, logoUrl } = await getClientInfo(interactionDetails?.params?.client_id);
                return res.status(err.statusCode || 400).send(renderForgotPasswordPage(uid, { error: err.message, authMethod, clientName, logoUrl }));
            }
            next(err);
        }
    };

    const getResetPassword = async (req, res, next) => {
        const { uid } = req.params;
        const { token, client_id } = req.query;
        try {
            const { clientName, logoUrl } = await getClientInfo(client_id);
            
            if (!token) {
                return res.status(400).send(renderResetPasswordPage(uid, "", client_id, { error: "Missing password reset token.", clientName, logoUrl }));
            }
            
            res.send(renderResetPasswordPage(uid, token, client_id, { clientName, logoUrl }));
        } catch (err) {
            next(err);
        }
    };

    const postResetPassword = async (req, res, next) => {
        const { uid } = req.params;
        const { client_id } = req.body;
        const isHtml = !req.is("application/json");

        try {
            await processResetPassword(client_id, req.body);

            if (isHtml) {
                const { clientName, logoUrl } = await getClientInfo(client_id);
                return res.send(renderResetPasswordPage(uid, "", client_id, { 
                    message: "Password has been successfully reset. You may now close this page and log in from the application.", 
                    clientName, 
                    logoUrl 
                }));
            } else {
                return res.status(200).json({ success: true, message: "Password has been successfully reset. Please log in with your new password." });
            }
        } catch (err) {
            if (isHtml) {
                const { clientName, logoUrl } = await getClientInfo(client_id);
                return res.status(err.statusCode || 400).send(renderResetPasswordPage(uid, req.body.token, client_id, { error: err.message, clientName, logoUrl }));
            }
            next(err);
        }
    };

    const confirmConsent = async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);

            if (interactionDetails.prompt.name !== "consent") {
                throw new AppError("This authentication session is invalid or does not require a consent step. Please restart the process.", 400);
            }

            const {
                prompt: { details },
                params,
                session: { accountId },
            } = interactionDetails;

            let grant;

            if (interactionDetails.grantId) {
                grant = await provider.Grant.find(interactionDetails.grantId);
            } else {
                grant = new provider.Grant({
                    accountId,
                    clientId: params.client_id,
                });
            }

            if (details.missingOIDCScope) {
                grant.addOIDCScope(details.missingOIDCScope.join(" "));
            }
            if (details.missingOIDCClaims) {
                grant.addOIDCClaims(details.missingOIDCClaims);
            }
            if (details.missingResourceScopes) {
                for (const [indicator, scopes] of Object.entries(details.missingResourceScopes)) {
                    grant.addResourceScope(indicator, scopes.join(" "));
                }
            }

            const grantId = await grant.save();
            const redirectTo = await provider.interactionResult(req, res, { consent: { grantId } }, { mergeWithLastSubmission: true });

            res.status(200).json({ success: true, message: "Consent granted", data: { redirectTo } });
        } catch (err) {
            next(err);
        }
    };

    const abortInteraction = async (req, res, next) => {
        try {
            const result = {
                error: "access_denied",
                error_description: "End-user aborted interaction",
            };

            const redirectTo = await provider.interactionResult(req, res, result, { mergeWithLastSubmission: false });
            res.status(200).json({ success: true, message: "Interaction aborted", data: { redirectTo } });
        } catch (err) {
            next(err);
        }
    };

    const getGoogleLogin = async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { client } = await getClientInfo(interactionDetails.params.client_id);
            
            if (!client || !client.socialLogins?.google?.enabled) {
                throw new AppError("Sign in with Google is not supported for this application.", 400);
            }

            const clientId = client.socialLogins.google.clientId || env.GOOGLE_CLIENT_ID;
            if (!clientId) throw new AppError("Google sign-in is currently unavailable due to missing server configuration.", 500);

            const redirectUri = `${env.OIDC_ISSUER.replace('/oidc', '')}/oauth2/v1/interaction/callback/google`;
            const state = req.params.uid;
            const scope = "openid email profile";
            
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
            
            res.redirect(googleAuthUrl);
        } catch (err) {
            next(err);
        }
    };

    const googleCallback = async (req, res, next) => {
        try {
            const { code, state: uid, error } = req.query;
            if (error) throw new AppError(`Failed to authenticate with Google. Please try again later. Details: ${error}`, 400);
            if (!code || !uid) throw new AppError("The Google sign-in callback is missing required parameters.", 400);

            const interaction = await provider.Interaction.find(uid);
            if (!interaction) throw new AppError("Your social login session has expired or is invalid. Please return to the application and try again.", 400);

            const resultObj = await processGoogleCallback(interaction.params.client_id, code);

            if (resultObj.action === "TOTP_REQUIRED") {
                return res.send(renderTOTPPage(uid, resultObj.data));
            }

            const result = { login: { accountId: resultObj.accountId } };
            interaction.result = result;
            await interaction.save(interaction.exp - Math.floor(Date.now() / 1000));
            
            res.redirect(interaction.returnTo);
        } catch (err) {
            next(err);
        }
    };

    const getMicrosoftLogin = async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const { client } = await getClientInfo(interactionDetails.params.client_id);
            
            if (!client || !client.socialLogins?.microsoft?.enabled) {
                throw new AppError("Sign in with Microsoft is not supported for this application.", 400);
            }

            const clientId = client.socialLogins.microsoft.clientId || env.MICROSOFT_CLIENT_ID;
            if (!clientId) throw new AppError("Microsoft sign-in is currently unavailable due to missing server configuration.", 500);

            const redirectUri = `${env.OIDC_ISSUER.replace('/oidc', '')}/oauth2/v1/interaction/callback/microsoft`;
            const state = req.params.uid;
            const scope = "openid email profile User.Read";
            
            const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
            
            res.redirect(msAuthUrl);
        } catch (err) {
            next(err);
        }
    };

    const microsoftCallback = async (req, res, next) => {
        try {
            const { code, state: uid, error, error_description } = req.query;
            if (error) throw new AppError(`Failed to authenticate with Microsoft. Please try again later. Details: ${error_description || error}`, 400);
            if (!code || !uid) throw new AppError("The Microsoft sign-in callback is missing required parameters.", 400);

            const interaction = await provider.Interaction.find(uid);
            if (!interaction) throw new AppError("Your social login session has expired or is invalid. Please return to the application and try again.", 400);

            const resultObj = await processMicrosoftCallback(interaction.params.client_id, code);

            if (resultObj.action === "TOTP_REQUIRED") {
                return res.send(renderTOTPPage(uid, resultObj.data));
            }

            const result = { login: { accountId: resultObj.accountId } };
            interaction.result = result;
            await interaction.save(interaction.exp - Math.floor(Date.now() / 1000));
            
            res.redirect(interaction.returnTo);
        } catch (err) {
            next(err);
        }
    };

    return {
        redirectLogin,
        getLogin,
        getSignup,
        postLogin,
        postSignup,
        confirmConsent,
        abortInteraction,
        getGoogleLogin,
        googleCallback,
        getMicrosoftLogin,
        microsoftCallback,
        getForgotPassword,
        postForgotPassword,
        getResetPassword,
        postResetPassword
    };
};

module.exports = { buildInteractionController };

