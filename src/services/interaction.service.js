const crypto = require("crypto");
const UserModel = require("../models/user.model");
const ClientModel = require("../models/client.model");
const { AppError } = require("../helpers/AppError");
const { sendEmail } = require("./email.service");
const { renderOTPEmail } = require("../views/email/otp.email.view");
const { renderTOTPSetupEmail } = require("../views/email/totp-setup.email.view");
const { renderForgotPasswordEmail } = require("../views/email/forgot-password.email.view");
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

const checkTOTPRequirement = async (user, client, email, phoneCode, phoneNumber) => {
    if (!client || !client.requireTOTP) return { required: false };

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

        return {
            required: true,
            setup: true,
            data: { secret, email, phoneCode, phoneNumber, clientName, logoUrl }
        };
    } else {
        const code = authenticator.generate(user.totpSecret);
        console.log(`\n\n=== [DEV TOTP VERIFY] User ${userIdentifier} needs code. CURRENT CODE: ${code} ===\n\n`);
        
        return {
            required: true,
            setup: false,
            data: { email, phoneCode, phoneNumber, clientName, logoUrl }
        };
    }
};

const getClientInfo = async (clientId) => {
    const client = await ClientModel.findOne({ clientId });
    return {
        client,
        authMethod: client ? client.authMethod : "EMAIL_PASSWORD",
        clientName: client ? client.clientName : "Auth Server",
        logoUrl: client ? client.logoUrl : null,
        socialLogins: client ? client.socialLogins : null,
        requireTOTP: client ? client.requireTOTP : false,
        allowedRegistrationDomains: client ? client.allowedRegistrationDomains : [],
    };
};

const sendAndRequireOTP = async (user, email, userIdentifierForLog, clientName, authMethod, phoneCode, phoneNumber, logoUrl, socialLogins) => {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    if (email) {
        try {
            const htmlContent = renderOTPEmail(generatedOtp, clientName);
            await sendEmail({
                to: email,
                subject: `Your OTP code for ${clientName}`,
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
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return {
        action: "OTP_REQUIRED",
        data: { authMethod, step: "OTP", email, phoneCode, phoneNumber, clientName, logoUrl, socialLogins }
    };
};

const verifyOTPStep = async (email, phoneCode, phoneNumber, otp) => {
    if (!otp) throw new AppError("A valid One-Time Password (OTP) code is required.", 422);
    if (!email && !phoneNumber) throw new AppError("Your session has expired due to inactivity. Please refresh the page and try logging in again.", 400);

    const userQuery = email ? { email } : { "contactInfo.phoneCode": phoneCode, "contactInfo.phoneNumber": phoneNumber };
    const user = await UserModel.findOne(userQuery);
    if (!user) throw new AppError("We couldn't verify your request. Please return to the login screen and try again.", 401);

    if (!user.otp || user.otp !== otp || new Date() > user.otpExpiresAt) {
        throw new AppError("The OTP code you entered is invalid or has expired. Please request a new code.", 401);
    }

    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();
    return user;
};

const verifyTOTPStep = async (email, phoneCode, phoneNumber, totpCode, totpSecret) => {
    if (!totpCode) throw new AppError("A two-factor authentication verification code is required to proceed.", 422);
    if (!email && !phoneNumber) throw new AppError("Your session has expired due to inactivity. Please refresh the page and try logging in again.", 400);

    const userQuery = email ? { email } : { "contactInfo.phoneCode": phoneCode, "contactInfo.phoneNumber": phoneNumber };
    const user = await UserModel.findOne(userQuery);
    if (!user) throw new AppError("We couldn't verify your request. Please return to the login screen and try again.", 401);

    const secretToVerify = user.totpSecret || totpSecret;
    if (!secretToVerify) throw new AppError("Two-factor authentication has not been configured for this account. Please complete the setup process first.", 400);

    const isValid = authenticator.check(totpCode, secretToVerify);
    if (!isValid) {
        throw new AppError("The verification code is invalid or has expired. Please try again.", 401);
    }

    if (!user.totpSecret && totpSecret) {
        user.totpSecret = totpSecret;
        await user.save();
    }
    return user;
};

const finalizeAuthStep = async (user, client, email, phoneCode, phoneNumber, successAction) => {
    const totpReq = await checkTOTPRequirement(user, client, email, phoneCode, phoneNumber);
    if (totpReq.required) {
        return { action: "TOTP_REQUIRED", accountId: user._id.toString(), ...totpReq };
    }
    return { action: successAction, accountId: user._id.toString() };
};

const processLoginStep = async (clientId, body) => {
    const { client, authMethod, clientName, logoUrl, socialLogins } = await getClientInfo(clientId);
    const { email, phoneCode, phoneNumber, password, otp, totpCode, totpSecret, step = "IDENTIFIER", loginMethod = "PASSWORD" } = body;

    switch (step) {
        case "IDENTIFIER": {
            if (!email && !phoneNumber) throw new AppError("Please provide either an email address or a phone number to continue.", 422);

            const clientHasPassword = authMethod.includes("PASSWORD");
            const clientHasOTP = authMethod.includes("OTP");
            
            let isPassword = clientHasPassword;
            let isOTP = clientHasOTP;

            if (clientHasPassword && clientHasOTP) {
                if (loginMethod === "PASSWORD") isOTP = false;
                else if (loginMethod === "OTP") isPassword = false;
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
                return await sendAndRequireOTP(user, email, userIdentifierForLog, clientName, authMethod, phoneCode, phoneNumber, logoUrl, socialLogins);
            } else {
                return await finalizeAuthStep(user, client, email, phoneCode, phoneNumber, "LOGIN_SUCCESS");
            }
        }
        case "OTP": {
            const user = await verifyOTPStep(email, phoneCode, phoneNumber, otp);
            return await finalizeAuthStep(user, client, email, phoneCode, phoneNumber, "LOGIN_SUCCESS");
        }
        case "TOTP": {
            const user = await verifyTOTPStep(email, phoneCode, phoneNumber, totpCode, totpSecret);
            return await finalizeAuthStep(user, client, email, phoneCode, phoneNumber, "LOGIN_SUCCESS");
        }
        default:
            throw new AppError("An invalid authentication step was requested. Please restart the login process.", 400);
    }
};

const processSignup = async (clientId, body) => {
    const { client, authMethod, clientName, logoUrl, socialLogins } = await getClientInfo(clientId);
    const { name, email, phoneCode, phoneNumber, password, otp, totpCode, totpSecret, step = "IDENTIFIER", loginMethod = "PASSWORD" } = body;

    switch (step) {
        case "IDENTIFIER": {
            if (!name) throw new AppError("Please provide your full name to create an account.", 422);
            if (!email && !phoneNumber) throw new AppError("Please provide either an email address or a phone number to continue.", 422);

            const isPassword = authMethod.includes("PASSWORD");
            const isOTP = authMethod.includes("OTP");

            if (isPassword && (!password || password.length < 8)) {
                throw new AppError("For your security, your password must be at least 8 characters long.", 422);
            }

            let userQuery = {};
            let domainEmail = null;
            let userIdentifierForLog = "";
            if (email) {
                userQuery.email = email;
                domainEmail = email;
                userIdentifierForLog = email;
            } else {
                userQuery["contactInfo.phoneCode"] = phoneCode;
                userQuery["contactInfo.phoneNumber"] = phoneNumber;
                userIdentifierForLog = `${phoneCode}${phoneNumber}`;
            }

            if (client && client.allowedRegistrationDomains && client.allowedRegistrationDomains.length > 0 && domainEmail) {
                const domain = domainEmail.split("@")[1].toLowerCase();
                if (!client.allowedRegistrationDomains.includes(domain)) {
                    throw new AppError("Registration is restricted. Your email domain is not authorized for this application.", 403);
                }
            }

            const existingUser = await UserModel.findOne(userQuery);
            if (existingUser) {
                throw new AppError(`An account with this ${email ? 'email address' : 'phone number'} already exists. Please log in instead.`, 409);
            }

            const newUserPayload = { name };
            if (email) newUserPayload.email = email;
            else newUserPayload.contactInfo = { phoneCode, phoneNumber };
            if (isPassword) newUserPayload.password = password;

            const user = await UserModel.create(newUserPayload);

            if (isOTP) {
                return await sendAndRequireOTP(user, email, userIdentifierForLog, clientName, authMethod, phoneCode, phoneNumber, logoUrl, socialLogins);
            } else {
                return await finalizeAuthStep(user, client, email, phoneCode, phoneNumber, "SIGNUP_SUCCESS");
            }
        }
        case "OTP": {
            const user = await verifyOTPStep(email, phoneCode, phoneNumber, otp);
            return await finalizeAuthStep(user, client, email, phoneCode, phoneNumber, "SIGNUP_SUCCESS");
        }
        case "TOTP": {
            const user = await verifyTOTPStep(email, phoneCode, phoneNumber, totpCode, totpSecret);
            return await finalizeAuthStep(user, client, email, phoneCode, phoneNumber, "SIGNUP_SUCCESS");
        }
        default:
            throw new AppError("An invalid authentication step was requested. Please restart the login process.", 400);
    }
};

const processGoogleCallback = async (clientId, code) => {
    const { client } = await getClientInfo(clientId);
    if (!client) throw new AppError("The specified application client could not be found.", 400);

    const googleClientId = client.socialLogins?.google?.clientId || env.GOOGLE_CLIENT_ID;
    const clientSecret = client.socialLogins?.google?.clientSecret || env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${env.OIDC_ISSUER.replace('/oidc', '')}/oauth2/v1/interaction/callback/google`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: googleClientId,
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

    return await finalizeAuthStep(user, client, email, null, null, "LOGIN_SUCCESS");
};

const processMicrosoftCallback = async (clientId, code) => {
    const { client } = await getClientInfo(clientId);
    if (!client) throw new AppError("The specified application client could not be found.", 400);

    const msClientId = client.socialLogins?.microsoft?.clientId || env.MICROSOFT_CLIENT_ID;
    const clientSecret = client.socialLogins?.microsoft?.clientSecret || env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = `${env.OIDC_ISSUER.replace('/oidc', '')}/oauth2/v1/interaction/callback/microsoft`;

    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: msClientId,
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

    return await finalizeAuthStep(user, client, email, null, null, "LOGIN_SUCCESS");
};

const processForgotPassword = async (clientId, body, uid, host) => {
    const { client, clientName } = await getClientInfo(clientId);
    const { email, phoneCode, phoneNumber } = body;

    if (!email && !phoneNumber) {
        throw new AppError("Please provide either an email address or a phone number.", 422);
    }

    const userQuery = email ? { email } : { "contactInfo.phoneCode": phoneCode, "contactInfo.phoneNumber": phoneNumber };
    const user = await UserModel.findOne(userQuery);

    if (!user) {
        // To prevent user enumeration, we don't return a 404. We just return a success message.
        return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    const resetLink = `http://${host}/oauth2/v1/interaction/${uid}/reset-password?token=${resetToken}&client_id=${clientId}`;

    if (email) {
        try {
            const htmlContent = renderForgotPasswordEmail(resetLink, clientName);
            await sendEmail({
                to: email,
                subject: `Password Reset Request - ${clientName}`,
                htmlContent
            });
            console.log(`[Email] Forgot Password sent to ${email}`);
        } catch (err) {
            console.error("[Email] Failed to send Forgot Password:", err);
        }
    } else {
        const userIdentifierForLog = `${phoneCode}${phoneNumber}`;
        console.log(`\n\n=== [DEV SMS] Forgot Password Link for ${userIdentifierForLog} is: ${resetLink} ===\n\n`);
    }

    return { success: true };
};

const processResetPassword = async (clientId, body) => {
    const { token, password, confirmPassword } = body;

    if (!token) throw new AppError("Invalid or missing password reset token.", 400);
    if (!password || password.length < 8) throw new AppError("Your password must be at least 8 characters long.", 422);
    if (password !== confirmPassword) throw new AppError("Passwords do not match.", 422);

    const user = await UserModel.findOne({ 
        resetPasswordToken: token, 
        resetPasswordExpiresAt: { $gt: Date.now() } 
    });

    if (!user) {
        throw new AppError("The password reset link is invalid or has expired.", 400);
    }

    user.password = password; // Hashing is handled by the model pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return { success: true };
};

module.exports = {
    getClientInfo,
    processLoginStep,
    processSignup,
    processGoogleCallback,
    processMicrosoftCallback,
    processForgotPassword,
    processResetPassword
};
