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
export const connectAbly = (forceReconnect = false) => {
	// If already connecting, skip unless forcing reconnect
	if (isConnecting && !forceReconnect) {
		return;
	}
	
	// If already connected and not forcing reconnect, skip
	if (ably && ably.connection.state === "connected" && !forceReconnect) {
		return;
	}
	
	// If forcing reconnect and already connected, disconnect first
	if (forceReconnect && ably && ably.connection.state === "connected") {
		try {
			ably.connection.close();
		} catch (error) {
			// Ignore errors during disconnect
		}
		// Reset the instance to force a new token request
		ably = null;
	}
	
	isConnecting = true;
	const instance = getAbly();
	
	// Handle successful connection
	instance.connection.once("connected", () => {
		isConnecting = false;
		console.log("[Ably] Connected successfully");
	});
	
	// Handle connection errors
	instance.connection.once("failed", () => {
		isConnecting = false;
	});
	
	// Try to connect - connect() may not return a Promise, so handle it safely
	try {
		const connectResult = instance.connection.connect();
		if (connectResult && typeof connectResult.catch === "function") {
			// If it returns a Promise, handle errors
			connectResult.catch(() => {
				// Silent - expected when not authenticated
				isConnecting = false;
			});
		} else {
			// If it doesn't return a Promise, connection will be handled by event listeners
			// Reset flag after a short delay in case connection fails immediately
			setTimeout(() => {
				if (instance.connection.state !== "connected" && instance.connection.state !== "connecting") {
					isConnecting = false;
				}
			}, 1000);
		}
	} catch (error) {
		// Silent - expected when not authenticated or during auth checks
		isConnecting = false;
	}
};

// Check if Ably is connected
export const isAblyConnected = () => {
	return ably && ably.connection.state === "connected";
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
