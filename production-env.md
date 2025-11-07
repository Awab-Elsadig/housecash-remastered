# Production Deployment Variables

Use this checklist when promoting the app to Vercel. Set the following environment variables before triggering a build so the client and server agree on the right endpoints and credentials.

## Client (`housecash` on Vercel)
- `VITE_API_URL=https://housecash-server.vercel.app`
- Remove legacy variables that are no longer needed: `VITE_ABLY_API_KEY`, `VITE_IMAGEKIT_PUBLIC_KEY`, and `VITE_IMAGEKIT_URL_ENDPOINT`.
- `VITE_SOCKET_URL` can be omitted (no socket server is deployed). If you leave it in place, point it at the same API URL.

## Server (`housecash-server` on Vercel)
- `ABLY_API_KEY=<your Ably root or key with appropriate capabilities>`
- `MONGO_URI=<production MongoDB connection string>` and optionally `MONGO_URI_FALLBACK`
- `JWT_SECRET=<strong random string>`
- `SESSION_SECRET=<strong random string>`
- Mail credentials if you use email features: `MAILTRAP_TOKEN` or `GOOGLE_APP_PASSWORD`

### Notes
- The client now requests Ably token requests from the server, so the raw Ably key must **only** exist in the server environment.
- Redeploy both projects after updating variables so Vite can bake the new values into the bundle and the server picks up its runtime secrets.

