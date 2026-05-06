const userService = require("../services/user.service");
const { catchAsync } = require("../helpers/catchAsync");

/**
 * GET /api/users/:id
 */
const getUserById = catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.id);

    res.status(200).json({
        success: true,
        data: user,
    });
});

module.exports = { getUserById };
