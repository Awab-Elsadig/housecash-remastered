import Ably from "ably";
import dotenv from "dotenv";

dotenv.config();

// Only create Ably instance if API key is provided
let ably = null;
let ablyStatus = "not_configured";

if (process.env.ABLY_API_KEY) {
	try {
		// Use Ably REST client for publishing from the server and generating tokens
		ably = new Ably.Rest({
			key: process.env.ABLY_API_KEY,
		});
		ablyStatus = "initialized";
	} catch (error) {
		console.error("❌ Failed to initialize Ably:", error.message);
		ably = null;
		ablyStatus = "failed";
	}
} else {
	console.warn("⚠️  ABLY_API_KEY not set; realtime features disabled");
	ablyStatus = "not_configured";
}

// Check Ably connection status
export const checkAblyStatus = async () => {
	if (!ably) {
		return {
			status: ablyStatus,
			configured: false,
			message: ablyStatus === "not_configured" ? "ABLY_API_KEY not set" : "Ably initialization failed"
		};
	}
	
	try {
		// Test Ably by trying to get a channel (this doesn't require a connection for REST client)
		const testChannel = ably.channels.get("test");
		// For REST client, we can't check connection state like Realtime client
		// But if we can get a channel, it means Ably is initialized
		return {
			status: "ready",
			configured: true,
			message: "Ably REST client initialized and ready"
		};
	} catch (error) {
		return {
			status: "error",
			configured: true,
			message: `Ably error: ${error.message}`
		};
	}
};

// Helper to generate token requests for authenticated clients
export const createAblyTokenRequest = async (clientId) => {
	if (!process.env.ABLY_API_KEY || !ably) {
		throw new Error("ABLY_API_KEY is not configured on the server");
	}

	return ably.auth.createTokenRequest({
		clientId,
	});
};

// Helper to publish messages (returns a no-op function if Ably is not configured)
export const publishToChannel = async (channelName, eventName, data) => {
	if (!ably) {
		return;
	}

	try {
		const channel = ably.channels.get(channelName);
		await channel.publish(eventName, data);
	} catch (error) {
		console.error(`[Ably] Error publishing to ${channelName}:${eventName}:`, error.message);
	}
};

export default ably;
