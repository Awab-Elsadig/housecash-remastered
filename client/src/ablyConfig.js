import { Realtime } from "ably";

const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:5000" : "https://housecash-server.vercel.app";
const baseApiUrl = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/$/, "");

let ably = null;
let isConnecting = false;

// Create Ably instance lazily - only when needed and authenticated
const getAbly = () => {
	if (!ably) {
		ably = new Realtime({
			authUrl: `${baseApiUrl}/api/ably/token`,
			authMethod: "GET",
			withCredentials: true,
			queryTime: true,
		});

		// Suppress all connection state logging
		ably.connection.on("connected", () => {
			// Silent - no console log needed
		});

		ably.connection.on("disconnected", () => {
			// Silent - no console log needed
		});

		// Suppress all connection errors - they're expected during auth checks
		ably.connection.on("failed", (error) => {
			// Silent - expected when not authenticated or during auth checks
			// Ably will retry automatically when authenticated
		});

		// Suppress auth errors (expected when not logged in)
		ably.connection.on("suspended", () => {
			// Silent - can happen when not authenticated
		});

		// Suppress auth errors from Ably's internal logger
		ably.connection.on("error", (error) => {
			// Silent - expected during auth checks
		});
	}
	return ably;
};

// Connect Ably only when authenticated
export const connectAbly = () => {
	if (isConnecting || (ably && ably.connection.state === "connected")) {
		return;
	}
	
	isConnecting = true;
	const instance = getAbly();
	
	// Try to connect, but don't log errors if it fails due to auth
	instance.connection.connect().catch(() => {
		// Silent - expected when not authenticated
		isConnecting = false;
	});
};

// Export a proxy object for backward compatibility
// This ensures that accessing ably.channels or ably.connection works
// but doesn't create the instance until actually needed
const ablyInstance = new Proxy({}, {
	get(target, prop) {
		const instance = getAbly();
		return instance[prop];
	}
});

export default ablyInstance;
