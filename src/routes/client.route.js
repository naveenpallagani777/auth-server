const express = require("express");
const router = express.Router();
const clientController = require("../controllers/client.controller");
const { requireApiKey } = require("../middleware/apiKey.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createClientSchema, updateClientSchema } = require("../validators/client.validator");

// All client routes require API key authentication
router.use(requireApiKey);

router.post("/", validate(createClientSchema), clientController.createClient);
router.get("/", clientController.getAllClients);
router.get("/:id", clientController.getClientById);
router.patch("/:id", validate(updateClientSchema), clientController.updateClient);
router.delete("/:id", clientController.deleteClient);
router.post("/:id/rotate-secret", clientController.rotateSecret);

module.exports = router;
