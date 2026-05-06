const { AppError } = require("../helpers/AppError");

/**
 * Validate request body against a Joi schema
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const messages = error.details.map((detail) => detail.message).join(", ");
            throw new AppError(messages, 422);
        }

        req.body = value;
        next();
    };
};

module.exports = { validate };
