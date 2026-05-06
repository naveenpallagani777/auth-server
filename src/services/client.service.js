const crypto = require("crypto");
const ClientModel = require("../models/client.model");
const { AppError } = require("../helpers/AppError");

/**
 * Create a new OIDC client
 */
const createClient = async (data) => {
    if (!data.clientName) {
        throw new AppError("Please provide a valid application name to register the client.", 400);
    }

    const clientId = data.clientName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const clientSecret = crypto.randomBytes(32).toString("hex");

    const client = await ClientModel.create({
        ...data,
        clientId,
        clientSecret,
    });

    return client;
};

/**
 * Get all clients (with optional pagination)
 */
const getAllClients = async ({ page = 1, limit = 20, active } = {}) => {
    const filter = {};
    if (active !== undefined) {
        filter.active = active;
    }

    const skip = (page - 1) * limit;
    const [clients, total] = await Promise.all([
        ClientModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        ClientModel.countDocuments(filter),
    ]);

    return {
        clients,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get client by clientId
 */
const getClientById = async (clientId) => {
    const client = await ClientModel.findOne({ clientId });
    if (!client) {
        throw new AppError("The requested application client could not be found.", 404);
    }
    return client;
};

/**
 * Update a client
 */
const updateClient = async (clientId, updates) => {
    // Fields that cannot be updated directly
    const immutableFields = ["clientId", "clientSecret"];
    for (const field of immutableFields) {
        delete updates[field];
    }

    const client = await ClientModel.findOneAndUpdate({ clientId }, { $set: updates }, {
        new: true,
        runValidators: true,
    });

    if (!client) {
        throw new AppError("The requested application client could not be found.", 404);
    }

    return client;
};

/**
 * Delete a client
 */
const deleteClient = async (clientId) => {
    const client = await ClientModel.findOneAndDelete({ clientId });

    if (!client) {
        throw new AppError("The requested application client could not be found.", 404);
    }

    return client;
};

/**
 * Rotate client secret — generate a new secret
 */
const rotateClientSecret = async (clientId) => {
    const newSecret = crypto.randomBytes(32).toString("hex");

    const client = await ClientModel.findOneAndUpdate(
        { clientId },
        { $set: { clientSecret: newSecret } },
        { new: true },
    );

    if (!client) {
        throw new AppError("The requested application client could not be found.", 404);
    }

    return client;
};

/**
 * Find active client by clientId (used by OIDC adapter)
 */
const findActiveClient = async (clientId) => {
    const client = await ClientModel.findOne({ clientId, active: true });
    if (!client) return undefined;
    return client.toOIDCClient();
};

module.exports = {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient,
    rotateClientSecret,
    findActiveClient,
};
