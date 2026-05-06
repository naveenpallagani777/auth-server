const UserModel = require("../models/user.model");
const ClientModel = require("../models/client.model");
const { AppError } = require("../helpers/AppError");
const { renderLoginPage, renderSignupPage, renderTOTPPage } = require("../views/auth.views");
const { sendEmail } = require("../services/email.service");
const { renderOTPEmail } = require("../views/email/otp.email.view");
const { renderTOTPSetupEmail } = require("../views/email/totp-setup.email.view");
const { authenticator } = require("otplib");
const qrcode = require("qrcode-terminal");
const fetch = require("node-fetch");
const env = require("../config/env");

const sendTOTPSetupEmail = async (email, secret, otpauth, clientName) => {
    if (!email) return;
    try {
        const htmlContent = renderTOTPSetupEmail(secret, otpauth, clientName);
        await sendEmail({
            to: email,
            subject: `Set up Two-Factor Authentication for ${clientName}`,
            htmlContent
        });
        console.log(`[Email] TOTP Setup sent to ${email}`);
    } catch (err) {
        console.error("[Email] Failed to send TOTP Setup:", err);
    }
};

const handleTOTPRequirement = async (req, res, uid, isHtml, user, client, email, phoneCode, phoneNumber) => {
    if (!client || !client.requireTOTP) return false;

    const clientName = client.clientName || "Auth Server";
    const logoUrl = client.logoUrl || null;
    const userIdentifier = email || `${phoneCode || ""}${phoneNumber || ""}`;

    if (!user.totpSecret) {
        const secret = authenticator.generateSecret();
        const code = authenticator.generate(secret);
        const otpauth = authenticator.keyuri(userIdentifier, clientName, secret);
        
        console.log(`\n\n=== [DEV TOTP SETUP] Secret for ${userIdentifier} is: ${secret} ===`);
        console.log(`=== [DEV TOTP SETUP] CURRENT CODE: ${code} ===`);
        console.log(`=== [DEV TOTP SETUP] SCAN THIS QR CODE IN YOUR APP: ===\n`);
        qrcode.generate(otpauth, { small: true });
        console.log(`\n======================================================\n`);
        
        if (email) {
            await sendTOTPSetupEmail(email, secret, otpauth, clientName);
        }

        if (isHtml) {
            res.send(renderTOTPPage(uid, { setup: true, secret, email, phoneCode, phoneNumber, clientName, logoUrl }));
        } else {
            res.status(200).json({ success: true, message: "TOTP setup required", data: { step: "TOTP", setup: true, secret, email, phoneCode, phoneNumber }});
        }
        return true;
    } else {
        const code = authenticator.generate(user.totpSecret);
        console.log(`\n\n=== [DEV TOTP VERIFY] User ${userIdentifier} needs code. CURRENT CODE: ${code} ===\n\n`);
        
        if (isHtml) {
            res.send(renderTOTPPage(uid, { setup: false, email, phoneCode, phoneNumber, clientName, logoUrl }));
        } else {
            res.status(200).json({ success: true, message: "TOTP verification required", data: { step: "TOTP", setup: false, email, phoneCode, phoneNumber }});
        }
        return true;
    }
};

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
                // If it's something else, don't silently render the login page
                throw new AppError(`The authentication server received an invalid or unexpected prompt type: ${prompt.name}. Please restart the login process.`, 400);
            }

            // Serve HTML for browser requests
            if (req.accepts("html")) {
                const client = await ClientModel.findOne({ clientId: params.client_id });
                const authMethod = client ? client.authMethod : "EMAIL_PASSWORD";
                const clientName = client ? client.clientName : "Auth Server";
                const logoUrl = client ? client.logoUrl : null;
                const socialLogins = client ? client.socialLogins : null;

                return res.send(renderLoginPage(uid, { authMethod, clientName, logoUrl, socialLogins }));
            }

            // JSON fallback for API clients
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
            // Validate interaction exists
            const interactionDetails = await provider.interactionDetails(req, res);
            const client = await ClientModel.findOne({ clientId: interactionDetails.params.client_id });
            const authMethod = client ? client.authMethod : "EMAIL_PASSWORD";
            const clientName = client ? client.clientName : "Auth Server";
            const logoUrl = client ? client.logoUrl : null;
            const socialLogins = client ? client.socialLogins : null;

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

            const client = await ClientModel.findOne({ clientId: interactionDetails.params.client_id });
            const authMethod = client ? client.authMethod : "EMAIL_PASSWORD";
            const requireTOTP = client ? client.requireTOTP : false;
            const clientName = client ? client.clientName : "Auth Server";
            const logoUrl = client ? client.logoUrl : null;
            const socialLogins = client ? client.socialLogins : null;

            const { email, phoneCode, phoneNumber, password, otp, totpCode, totpSecret, step = "IDENTIFIER", loginMethod = "PASSWORD" } = req.body;

            if (step === "IDENTIFIER") {
                if (!email && !phoneNumber) throw new AppError("Please provide either an email address or a phone number to continue.", 422);

                const clientHasPassword = authMethod.includes("PASSWORD");
                const clientHasOTP = authMethod.includes("OTP");
                
                let isPassword = clientHasPassword;
                let isOTP = clientHasOTP;

                // If client supports both, let the user's selected method take precedence
                if (clientHasPassword && clientHasOTP) {
                    if (loginMethod === "PASSWORD") {
                        isOTP = false;
                    } else if (loginMethod === "OTP") {
                        isPassword = false;
                    }
                }

                if (isPassword && !password) throw new AppError("Please enter your password to continue.", 422);

                let userQuery = {};
                let userIdentifierForLog = "";
                if (email) {
                    userQuery.email = email;
                    userIdentifierForLog = email;
                } else if (phoneCode && phoneNumber) {
                    userQuery["contactInfo.phoneCode"] = phoneCode;
                    userQuery["contactInfo.phoneNumber"] = phoneNumber;
                    userIdentifierForLog = `${phoneCode}${phoneNumber}`;
                }

                // Find and verify user
                const user = await UserModel.findOne(userQuery);
                if (!user) {
                    throw new AppError("The email or password you entered is incorrect. Please double-check your credentials.", 401);
                }

                if (isPassword) {
                    const isMatch = await user.comparePassword(password);
                    if (!isMatch) {
                        throw new AppError("The email or password you entered is incorrect. Please double-check your credentials.", 401);
                    }
                }

                if (isOTP) {
                    // Generate OTP
                    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    
                    if (email) {
                        try {
                            const htmlContent = renderOTPEmail(generatedOtp, clientName || "Auth Server");
                            await sendEmail({
                                to: email,
                                subject: `Your OTP code for ${clientName || "Auth Server"}`,
                                htmlContent
                            });
                            console.log(`[Email] OTP sent to ${email}`);
                        } catch (err) {
                            console.error("[Email] Failed to send OTP:", err);
                        }
                    } else {
                        console.log(`\n\n=== [DEV OTP] SMS OTP for ${userIdentifierForLog} is: ${generatedOtp} ===\n\n`);
                    }
                    
                    user.otp = generatedOtp;
                    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
                    await user.save();

                    if (isHtml) {
                        return res.send(renderLoginPage(uid, { authMethod, step: "OTP", email, phoneCode, phoneNumber, clientName, logoUrl, socialLogins }));
                    } else {
                        return res.status(200).json({ success: true, message: "OTP sent", data: { step: "OTP", email, phoneCode, phoneNumber }});
                    }
                } else {
                    if (await handleTOTPRequirement(req, res, uid, isHtml, user, client, email, phoneCode, phoneNumber)) {
                        return;
                    }

                    // Complete login interaction
                    const result = { login: { accountId: user._id.toString() } };
                    const redirectTo = await provider.interactionResult(req, res, result, { mergeWithLastSubmission: true });
                    
                    if (isHtml) return res.redirect(redirectTo);
                    return res.status(200).json({ success: true, message: "Login successful", data: { redirectTo }});
                }
            } else if (step === "OTP") {
                if (!otp) throw new AppError("A valid One-Time Password (OTP) code is required.", 422);
                if (!email && !phoneNumber) throw new AppError("Your session has expired due to inactivity. Please refresh the page and try logging in again.", 400);

                let userQuery = {};
                if (email) {
                    userQuery.email = email;
                } else {
                    userQuery["contactInfo.phoneCode"] = phoneCode;
                    userQuery["contactInfo.phoneNumber"] = phoneNumber;
                }
                const user = await UserModel.findOne(userQuery);
                if (!user) throw new AppError("We couldn't verify your request. Please return to the login screen and try again.", 401);

                if (!user.otp || user.otp !== otp || new Date() > user.otpExpiresAt) {
                    if (isHtml) {
                        return res.send(renderLoginPage(uid, { error: "Invalid or expired OTP", authMethod, step: "OTP", email, phoneCode, phoneNumber, clientName, logoUrl, socialLogins }));
                    } else {
                        throw new AppError("The OTP code you entered is invalid or has expired. Please request a new code.", 401);
                    }
                }

                // clear OTP
                user.otp = null;
                user.otpExpiresAt = null;
                await user.save();

                if (await handleTOTPRequirement(req, res, uid, isHtml, user, client, email, phoneCode, phoneNumber)) {
                    return;
                }

                const result = { login: { accountId: user._id.toString() } };
                const redirectTo = await provider.interactionResult(req, res, result, { mergeWithLastSubmission: true });
                
                if (isHtml) return res.redirect(redirectTo);
                return res.status(200).json({ success: true, message: "Login successful", data: { redirectTo }});
            } else if (step === "TOTP") {
                if (!totpCode) throw new AppError("A two-factor authentication verification code is required to proceed.", 422);
                if (!email && !phoneNumber) throw new AppError("Your session has expired due to inactivity. Please refresh the page and try logging in again.", 400);

                let userQuery = {};
                if (email) {
                    userQuery.email = email;
                } else {
                    userQuery["contactInfo.phoneCode"] = phoneCode;
                    userQuery["contactInfo.phoneNumber"] = phoneNumber;
                }

                const user = await UserModel.findOne(userQuery);
                if (!user) throw new AppError("We couldn't verify your request. Please return to the login screen and try again.", 401);

                const secretToVerify = user.totpSecret || totpSecret;
                if (!secretToVerify) throw new AppError("Two-factor authentication has not been configured for this account. Please complete the setup process first.", 400);

                const isValid = authenticator.check(totpCode, secretToVerify);
                if (!isValid) {
                    const errorMsg = "The verification code is invalid or has expired. Please try again.";
                    if (isHtml) {
                        return res.send(renderTOTPPage(uid, { 
                            error: errorMsg, 
                            setup: !user.totpSecret, 
                            secret: totpSecret, 
                            email, phoneCode, phoneNumber,
                            clientName, logoUrl
                        }));
                    } else {
                        throw new AppError(errorMsg, 401);
                    }
                }

                // If setup, save the secret
                if (!user.totpSecret && totpSecret) {
                    user.totpSecret = totpSecret;
                    await user.save();
                }

                const result = { login: { accountId: user._id.toString() } };
                const redirectTo = await provider.interactionResult(req, res, result, { mergeWithLastSubmission: true });
                
                if (isHtml) return res.redirect(redirectTo);
                return res.status(200).json({ success: true, message: "Login successful", data: { redirectTo }});
            } else {
                throw new AppError("An invalid authentication step was requested. Please restart the login process.", 400);
            }
        } catch (err) {
            // Improve the error message for SessionNotFound
            if (err.name === "SessionNotFound") {
                err.message = "Login session expired or already completed. If you are using a React app, ensure you are using window.location.href to follow the redirectTo URL, NOT fetch/axios.";
                err.statusCode = 400;
            }

            if (isHtml) {
                const client = await ClientModel.findOne({ clientId: interactionDetails?.params?.client_id });
                const authMethod = client ? client.authMethod : "EMAIL_PASSWORD";
                const clientName = client ? client.clientName : "Auth Server";
                const logoUrl = client ? client.logoUrl : null;
                const socialLogins = client ? client.socialLogins : null;
                return res.status(err.statusCode || 400).send(renderLoginPage(uid, { error: err.message, authMethod, clientName, logoUrl, socialLogins }));
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

            const client = await ClientModel.findOne({ clientId: interactionDetails.params.client_id });
            const authMethod = client ? client.authMethod : "EMAIL_PASSWORD";
            const clientName = client ? client.clientName : "Auth Server";
            const logoUrl = client ? client.logoUrl : null;
            const socialLogins = client ? client.socialLogins : null;

            const { name, email, phoneCode, phoneNumber, password } = req.body;

            if (!name) {
                throw new AppError("Please provide your full name to create an account.", 422);
            }
            if (!email && !phoneNumber) {
                throw new AppError("Please provide either an email address or a phone number to continue.", 422);
            }

            const isPassword = authMethod.includes("PASSWORD");
            if (isPassword && (!password || password.length < 8)) {
                throw new AppError("For your security, your password must be at least 8 characters long.", 422);
            }

            let userQuery = {};
            let domainEmail = null;
            if (email) {
                userQuery.email = email;
                domainEmail = email;
            } else {
                userQuery["contactInfo.phoneCode"] = phoneCode;
                userQuery["contactInfo.phoneNumber"] = phoneNumber;
            }

            // Check domain restriction if applicable
            if (client && client.allowedRegistrationDomains && client.allowedRegistrationDomains.length > 0 && domainEmail) {
                const domain = domainEmail.split("@")[1].toLowerCase();
                if (!client.allowedRegistrationDomains.includes(domain)) {
                    throw new AppError("Registration is restricted. Your email domain is not authorized for this application.", 403);
                }
            }

            // Check for existing user
            const existingUser = await UserModel.findOne(userQuery);
            if (existingUser) {
                throw new AppError(`An account with this ${email ? 'email address' : 'phone number'} already exists. Please log in instead.`, 409);
            }

            // Create user payload
            const newUserPayload = { name };
            if (email) {
                newUserPayload.email = email;
            } else {
                newUserPayload.contactInfo = { phoneCode, phoneNumber };
            }
            if (isPassword) newUserPayload.password = password;

            // Create user
            const user = await UserModel.create(newUserPayload);

            // Complete login interaction with the new account
            const result = {
                login: {
                    accountId: user._id.toString(),
                },
            };

            if (await handleTOTPRequirement(req, res, uid, isHtml, user, client, email, phoneCode, phoneNumber)) {
                return;
            }

            const redirectTo = await provider.interactionResult(req, res, result, {
                mergeWithLastSubmission: true,
            });

            if (isHtml) {
                return res.redirect(redirectTo);
            }

            res.status(201).json({
                success: true,
                message: "Account created successfully",
                data: { redirectTo },
            });
        } catch (err) {
            if (isHtml) {
                const client = await ClientModel.findOne({ clientId: interactionDetails?.params?.client_id });
                const authMethod = client ? client.authMethod : "EMAIL_PASSWORD";
                const clientName = client ? client.clientName : "Auth Server";
                const logoUrl = client ? client.logoUrl : null;
                const socialLogins = client ? client.socialLogins : null;
                return res.status(err.statusCode || 400).send(renderSignupPage(uid, { error: err.message, authMethod, clientName, logoUrl, socialLogins }));
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
                // Update existing grant
                grant = await provider.Grant.find(interactionDetails.grantId);
            } else {
                // Create new grant
                grant = new provider.Grant({
                    accountId,
                    clientId: params.client_id,
                });
            }

            // Grant requested scopes
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

            const result = { consent: { grantId } };

            const redirectTo = await provider.interactionResult(req, res, result, {
                mergeWithLastSubmission: true,
            });

            res.status(200).json({
                success: true,
                message: "Consent granted",
                data: { redirectTo },
            });
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

            const redirectTo = await provider.interactionResult(req, res, result, {
                mergeWithLastSubmission: false,
            });

            res.status(200).json({
                success: true,
                message: "Interaction aborted",
                data: { redirectTo },
            });
        } catch (err) {
            next(err);
        }
    };

    const getGoogleLogin = async (req, res, next) => {
        try {
            const interactionDetails = await provider.interactionDetails(req, res);
            const client = await ClientModel.findOne({ clientId: interactionDetails.params.client_id });
            
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

            const client = await ClientModel.findOne({ clientId: interaction.params.client_id });
            if (!client) throw new AppError("The specified application client could not be found.", 400);

            const clientId = client.socialLogins?.google?.clientId || env.GOOGLE_CLIENT_ID;
            const clientSecret = client.socialLogins?.google?.clientSecret || env.GOOGLE_CLIENT_SECRET;
            const redirectUri = `${env.OIDC_ISSUER.replace('/oidc', '')}/oauth2/v1/interaction/callback/google`;

            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) throw new AppError(`Failed to securely connect with Google. Please try again later.`, 400);

            const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const userData = await userRes.json();
            if (!userRes.ok) throw new AppError("Failed to retrieve your profile information from Google.", 400);

            const { id: googleId, email, name, picture } = userData;

            if (client.allowedRegistrationDomains && client.allowedRegistrationDomains.length > 0 && email) {
                const domain = email.split("@")[1].toLowerCase();
                if (!client.allowedRegistrationDomains.includes(domain)) {
                    throw new AppError("Registration is restricted. Your email domain is not authorized for this application.", 403);
                }
            }

            let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });
            if (user) {
                if (!user.googleId) {
                    user.googleId = googleId;
                    await user.save();
                }
            } else {
                user = await UserModel.create({
                    email,
                    name,
                    picture,
                    googleId,
                    emailVerified: true
                });
            }

            if (await handleTOTPRequirement(req, res, uid, true, user, client, email, null, null)) {
                return;
            }

            const result = { login: { accountId: user._id.toString() } };
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
            const client = await ClientModel.findOne({ clientId: interactionDetails.params.client_id });
            
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

            const client = await ClientModel.findOne({ clientId: interaction.params.client_id });
            if (!client) throw new AppError("The specified application client could not be found.", 400);

            const clientId = client.socialLogins?.microsoft?.clientId || env.MICROSOFT_CLIENT_ID;
            const clientSecret = client.socialLogins?.microsoft?.clientSecret || env.MICROSOFT_CLIENT_SECRET;
            const redirectUri = `${env.OIDC_ISSUER.replace('/oidc', '')}/oauth2/v1/interaction/callback/microsoft`;

            const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: redirectUri
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) throw new AppError(`Failed to fetch Microsoft token: ${tokenData.error_description || tokenData.error}`, 400);

            const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const userData = await userRes.json();
            if (!userRes.ok) throw new AppError("Failed to fetch Microsoft user info", 400);

            const microsoftId = userData.id;
            const email = userData.userPrincipalName || userData.mail;
            const name = userData.displayName;

            if (client.allowedRegistrationDomains && client.allowedRegistrationDomains.length > 0 && email) {
                const domain = email.split("@")[1].toLowerCase();
                if (!client.allowedRegistrationDomains.includes(domain)) {
                    throw new AppError("Registration is restricted to allowed email domains", 403);
                }
            }

            let user = await UserModel.findOne({ $or: [{ microsoftId }, { email }] });
            if (user) {
                if (!user.microsoftId) {
                    user.microsoftId = microsoftId;
                    await user.save();
                }
            } else {
                user = await UserModel.create({
                    email,
                    name,
                    microsoftId,
                    emailVerified: true
                });
            }

            if (await handleTOTPRequirement(req, res, uid, true, user, client, email, null, null)) {
                return;
            }

            const result = { login: { accountId: user._id.toString() } };
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
    };
};

module.exports = { buildInteractionController };
