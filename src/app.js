const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { NODE_ENV } = require("./config/env");
const routes = require("./routes");

const app = express();

// --------------- Global Middleware ---------------
app.use(
    helmet({
        contentSecurityPolicy:
            NODE_ENV === "production"
                ? undefined
                : {
                    useDefaults: true,
                    directives: {
                        "upgrade-insecure-requests": null,
                        "form-action": null,
                        "script-src": ["'self'", "'unsafe-inline'"],
                        "img-src": ["'self'", "data:", "https:"],
                    },
                },
    })
);
app.use(cors({ origin: true, credentials: true }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// Skip body parsing for OIDC provider routes (it handles its own)
app.use((req, res, next) => {
    if (req.path.startsWith("/oidc")) {
        return next();
    }
    express.json()(req, res, next);
});
app.use((req, res, next) => {
    if (req.path.startsWith("/oidc")) {
        return next();
    }
    express.urlencoded({ extended: true })(req, res, next);
});

app.use(cookieParser());

// --------------- API Routes ---------------
app.use("/api", routes);

// NOTE: OIDC provider, interaction routes, and error handlers are mounted
// in index.js after the provider is initialized (they depend on it).

module.exports = app;
