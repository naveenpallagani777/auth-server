const clientService = require("../services/client.service");
const { catchAsync } = require("../helpers/catchAsync");

/**
 * POST /api/clients
 */
const createClient = catchAsync(async (req, res) => {
    const client = await clientService.createClient(req.body);

    res.status(201).json({
        success: true,
        message: "Client created",
        data: client,
    });
});

/**
 * GET /api/clients
 */
const getAllClients = catchAsync(async (req, res) => {
    const { page, limit, active } = req.query;

    const result = await clientService.getAllClients({
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        active: active !== undefined ? active === "true" : undefined,
    });

    res.status(200).json({
        success: true,
        data: result.clients,
        pagination: result.pagination,
    });
});

/**
 * GET /api/clients/:id
 */
const getClientById = catchAsync(async (req, res) => {
    const client = await clientService.getClientById(req.params.id);

    res.status(200).json({
        success: true,
        data: client,
    });
});

/**
 * PATCH /api/clients/:id
 */
const updateClient = catchAsync(async (req, res) => {
    const client = await clientService.updateClient(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: "Client updated",
        data: client,
    });
});

/**
 * DELETE /api/clients/:id
 */
const deleteClient = catchAsync(async (req, res) => {
    await clientService.deleteClient(req.params.id);

    res.status(200).json({
        success: true,
        message: "Client deleted",
    });
});

/**
 * POST /api/clients/:id/rotate-secret
 */
const rotateSecret = catchAsync(async (req, res) => {
    const client = await clientService.rotateClientSecret(req.params.id);

    res.status(200).json({
        success: true,
        message: "Client secret rotated",
        data: client,
    });
});

module.exports = {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient,
    rotateSecret,
};
