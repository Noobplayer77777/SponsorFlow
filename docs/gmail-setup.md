# Google Cloud & Gmail API Setup

SponsorFlow requires Google OAuth for both authentication (Login) and Gmail integration (Sending emails). Each user must authorize their own Gmail account, and the application stores their secure tokens without ever seeing their password.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **SponsorFlow**.
3. Navigate to **APIs & Services > Library**.
4. Enable the following APIs:
   - **Google OAuth2 API** (for Login)
   - **Gmail API** (for sending emails)

## 2. Configure the OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** (or **Internal** if only your Google Workspace organization will use this).
3. Fill in the required App Information (App name: SponsorFlow, Support email).
4. Add the following scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.send` (Critical for sending emails)
5. Add test users if the app is in "Testing" mode.

## 3. Create OAuth Credentials

1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application type: **Web application**.
4. Authorized JavaScript origins:
   - `http://localhost:3000` (Frontend)
   - `http://localhost:5000` (Backend API)
5. Authorized redirect URIs:
   - `http://localhost:3000/gmail/callback` (If handling callback on the frontend)
   - `http://localhost:5000/api/gmail/callback` (If handling entirely on backend)
   *Note: In our current setup, we redirect from Google directly to the frontend callback `http://localhost:3000/gmail/callback` which then passes the `code` to the backend.*

## 4. Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory and populate:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=http://localhost:3000/gmail/callback
```

## How Gmail Integration Works Securely
1. The user clicks "Connect Gmail" on their dashboard.
2. The backend generates a secure OAuth URL requesting offline access.
3. The user authorizes SponsorFlow.
4. Google redirects to the frontend callback with an authorization `code`.
5. The frontend sends the `code` to `POST /api/gmail/callback`.
6. The backend securely exchanges the code for an `access_token` and `refresh_token` via the `googleapis` SDK.
7. These tokens are stored securely in the PostgreSQL database attached to the specific `User` record.
8. When the user clicks "Send Email", the backend creates a raw Base64-encoded RFC 2822 message.
9. The backend authenticates a Gmail client on the fly using the user's tokens (automatically refreshing if expired) and calls `gmail.users.messages.send`.
10. If the user revokes access via their Google Account, the API returns `invalid_grant` and SponsorFlow automatically nullifies the DB tokens, requiring reconnection.
