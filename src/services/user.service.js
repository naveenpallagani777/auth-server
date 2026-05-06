const UserModel = require("../models/user.model");
const { AppError } = require("../helpers/AppError");

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new AppError("We couldn't find an account matching the provided ID.", 404);
    }
    return user;
};

/**
 * Update user profile (name, picture only — no email/password here)
 */
const updateUser = async (userId, updates) => {
    const allowedFields = ["name", "picture"];
    const sanitized = {};

    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            sanitized[key] = updates[key];
        }
    }

    const user = await UserModel.findByIdAndUpdate(userId, sanitized, {
        new: true,
        runValidators: true,
    });

    if (!user) {
        throw new AppError("We couldn't find an account matching the provided ID.", 404);
    }

    return user;
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
    return UserModel.findOne({ email });
};

module.exports = { getUserById, updateUser, getUserByEmail };
