# OIDC Auth Server

A fully-featured OIDC-compatible authentication server built with Node.js, Express, MongoDB, and `oidc-provider`. 

This server supports multiple authentication methods including password, OTP (Email/Phone), TOTP (Two-Factor Authentication), and social logins (Google, Microsoft).

## Prerequisites

- Node.js (v18+ recommended)
- MongoDB

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**

   Copy the provided `.sample.env` file to `.env` and update the values:

   ```bash
   cp .sample.env .env
   ```

   Key environment variables to configure:
   - `PORT`: The port the server will run on (default: 4000)
   - `MONGO_URI`: Your MongoDB connection string
   - `OIDC_ISSUER`: The base URL of your OIDC server (e.g., `http://localhost:4000/oidc`)
   - `OIDC_COOKIE_KEYS`: Comma-separated secret keys for signing cookies
   - `ADMIN_API_KEY`: A secure key used to protect client management endpoints

3. **Start the Server**

   For development (with hot-reload):
   ```bash
   npm run dev
   ```

   For production:
   ```bash
   npm start
   ```

## Client Management

Clients (applications connecting to this auth server) are managed via an API. All client management endpoints require the `x-api-key` header to match your `ADMIN_API_KEY` environment variable.

### Creating a Client

To create a new OIDC client, make a `POST` request to `/clients` (relative to your base URL).

**Example Request:**

```bash
curl -X POST http://localhost:4000/clients \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-admin-api-key" \
  -d '{
    "clientName": "My Awesome App",
    "redirectUrls": ["http://localhost:3000/api/auth/callback"],
    "postLogoutRedirectUrls": ["http://localhost:3000/"],
    "grantTypes": ["authorization_code", "refresh_token"],
    "responseTypes": ["code"],
    "authMethod": "EMAIL_PASSWORD",
    "requireTOTP": false
  }'
```

**Required Fields for Creation:**
- `clientName`: (string) The name of the client.
- `redirectUrls`: (array of strings) A list of valid URIs where the OIDC provider is allowed to redirect the user after successful authentication.

**Optional Fields & Features:**
- `authMethod`: Choose from `EMAIL_PASSWORD`, `PHONE_PASSWORD`, `EMAIL_OTP`, `PHONE_OTP`, `EMAIL_PHONE_PASSWORD_OTP`, `EMAIL_PASSWORD_OTP`, `PHONE_PASSWORD_OTP`.
- `requireTOTP`: Set to `true` to mandate Two-Factor Authentication for this client.
- `socialLogins`: Configure Google and/or Microsoft login integration for specific clients.

### Other Client Endpoints

- `GET /clients`: List all clients
- `GET /clients/:id`: Get a specific client
- `PATCH /clients/:id`: Update an existing client
- `DELETE /clients/:id`: Delete a client
- `POST /clients/:id/rotate-secret`: Rotate the client secret

## OIDC Authentication Endpoints

The server acts as a standard OpenID Connect Provider mounted at `/oidc`. Below are the primary endpoints used by client applications to authenticate users.

- **Discovery Endpoint:** `GET /oidc/.well-known/openid-configuration`
  Returns the server's configuration, including all supported endpoints, scopes, and claims.
- **Authorization Endpoint:** `GET /oidc/auth`
  Initiates the authorization code flow. Redirects the user to the login/interaction pages.
- **Token Endpoint:** `POST /oidc/token`
  Exchanges an authorization code for an ID token, access token, and refresh token.
- **UserInfo Endpoint:** `GET /oidc/me`
  Returns claims about the authenticated user (requires a valid access token).
- **JWKS Endpoint:** `GET /oidc/jwks`
  Returns the public keys used by clients to verify ID token signatures.
