import Ably from "ably";
import dotenv from "dotenv";

dotenv.config();

// Only create Ably instance if API key is provided
let ably = null;

if (process.env.ABLY_API_KEY) {
	try {
		// Use Ably REST client for publishing from the server and generating tokens
		ably = new Ably.Rest({
			key: process.env.ABLY_API_KEY,
		});
	} catch (error) {
		console.error("❌ Failed to initialize Ably:", error.message);
		ably = null;
	}
} else {
	console.warn("⚠️  ABLY_API_KEY not set; realtime features disabled");
}

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
