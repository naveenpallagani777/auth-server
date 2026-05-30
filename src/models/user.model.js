const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        contactInfo: {
            phoneCode: {
                type: String,
                trim: true,
            },
            phoneNumber: {
                type: String,
                trim: true,
                validate: {
                    validator: function (v) {
                        if (!v || !this.contactInfo || !this.contactInfo.phoneCode) return true;
                        const lengths = {
                            "+91": 10,
                            "+1": 10,
                            "+44": 10,
                            "+61": 9,
                            "+81": 10,
                            "+49": 11,
                            "+33": 9,
                            "+971": 9,
                            "+65": 8,
                            "+86": 11,
                        };
                        const expectedLength = lengths[this.contactInfo.phoneCode];
                        if (expectedLength && v.length !== expectedLength) {
                            return false;
                        }
                        return true;
                    },
                    message: "Invalid phone number length for the given country code.",
                },
            },
        },
        password: {
            type: String,
            minlength: 8,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        picture: {
            type: String,
            default: null,
        },
        otp: {
            type: String,
            default: null,
        },
        otpExpiresAt: {
            type: Date,
            default: null,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        totpSecret: {
            type: String,
            default: null,
        },
        googleId: {
            type: String,
            default: null,
            sparse: true,
            index: true,
        },
        microsoftId: {
            type: String,
            default: null,
            sparse: true,
            index: true,
        },
        resetPasswordToken: {
            type: String,
            default: null,
        },
        resetPasswordExpiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

// --------------- Indexes ---------------
userSchema.index(
    { "contactInfo.phoneCode": 1, "contactInfo.phoneNumber": 1 },
    { unique: true, sparse: true }
);

// --------------- Hooks ---------------
userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --------------- Methods ---------------
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
