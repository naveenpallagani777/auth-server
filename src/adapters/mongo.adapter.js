const mongoose = require("mongoose");

/**
 * MongoDB adapter for oidc-provider
 * Stores OIDC artifacts (tokens, sessions, grants, etc.) in MongoDB
 * Also loads Client metadata from the Client collection
 *
 * Docs: https://github.com/panva/node-oidc-provider/blob/main/example/my_adapter.js
 */

const grantable = new Set([
    "AccessToken",
    "AuthorizationCode",
    "RefreshToken",
    "DeviceCode",
    "BackchannelAuthenticationRequest",
]);

const models = {};

function getModel(name) {
    // 'Client' lookups go through _findClient(), no dynamic model needed
    if (name === "Client") return null;

    if (!models[name]) {
        const schema = new mongoose.Schema(
            {
                _id: { type: String },
                data: { type: Object },
                expiresAt: { type: Date },
                consumedAt: { type: Date },
                grantId: { type: String },
                userCode: { type: String },
                uid: { type: String },
            },
            { timestamps: true },
        );

        schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        schema.index({ grantId: 1 });
        schema.index({ userCode: 1 });
        schema.index({ uid: 1 });

        // Prefix collection name to avoid collisions with app models
        const collectionName = `oidc_${name.toLowerCase()}`;
        models[name] = mongoose.model(`OIDC_${name}`, schema, collectionName);
    }

    return models[name];
}

class MongoAdapter {
    constructor(name) {
        this.name = name;
        this.model = getModel(name);
    }

    async upsert(id, payload, expiresIn) {
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
        console.log(`[MongoAdapter] UPSERT ${this.name} | id: ${id} | uid: ${payload.uid}`);

        await this.model.updateOne(
            { _id: id },
            { 
                $set: { 
                    data: payload, 
                    ...(payload.uid ? { uid: payload.uid } : {}),
                    ...(payload.userCode ? { userCode: payload.userCode } : {}),
                    ...(payload.grantId ? { grantId: payload.grantId } : {}),
                    ...(expiresAt ? { expiresAt } : {}) 
                } 
            },
            { upsert: true },
        );
    }

    async find(id) {
        // For Client model, look up from the Client collection
        if (this.name === "Client") {
            return this._findClient(id);
        }

        console.log(`[MongoAdapter] FIND ${this.name} | id: ${id}`);
        const doc = await this.model.findById(id).lean();
        
        if (!doc) {
            console.log(`[MongoAdapter] FIND ${this.name} | id: ${id} | RESULT: NOT FOUND`);
            return undefined;
        }
        
        if (doc.expiresAt && doc.expiresAt < new Date()) {
            console.log(`[MongoAdapter] FIND ${this.name} | id: ${id} | RESULT: EXPIRED`);
            return undefined;
        }

        const result = { ...doc.data };
        if (doc.consumedAt) {
            result.consumed = true;
        }
        return result;
    }

    /**
     * Look up a client from the Client collection (our CRUD-managed clients)
     */
    async _findClient(clientId) {
        // Lazy-require to avoid circular dependency
        const ClientModel = require("../models/client.model");

        const client = await ClientModel.findOne({ clientId, active: true }).lean();
        if (!client) return undefined;

        // Return in oidc-provider expected format
        return {
            client_id: client.clientId,
            client_secret: client.clientSecret,
            client_name: client.clientName,
            redirect_uris: client.redirectUrls,
            post_logout_redirect_uris: client.postLogoutRedirectUrls || [],
            grant_types: client.grantTypes,
            response_types: client.responseTypes,
            scope: client.scope,
            token_endpoint_auth_method: client.tokenEndpointAuthMethod || "client_secret_basic",
            application_type: client.applicationType || "web",
            logo_uri: client.logoUrl || undefined,
            client_uri: client.clientUrl || undefined,
            policy_uri: client.policyUrl || undefined,
            tos_uri: client.tosUrl || undefined,
        };
    }

    async findByUserCode(userCode) {
        const doc = await this.model.findOne({ userCode }).lean();
        if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) return undefined;
        return doc.data;
    }

    async findByUid(uid) {
        const doc = await this.model.findOne({ uid }).lean();
        if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) return undefined;
        return doc.data;
    }

    async consume(id) {
        await this.model.updateOne({ _id: id }, { $set: { consumedAt: new Date() } });
    }

    async destroy(id) {
        await this.model.deleteOne({ _id: id });
    }

    async revokeByGrantId(grantId) {
        await this.model.deleteMany({ grantId });
    }
}

module.exports = MongoAdapter;
