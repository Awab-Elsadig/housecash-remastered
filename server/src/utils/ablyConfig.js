import Ably from "ably";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.ABLY_API_KEY) {
	console.warn("[Ably] ABLY_API_KEY is not set; realtime features will be disabled.");
}

// Use Ably REST client for publishing from the server and generating tokens
const ably = new Ably.Rest({
	key: process.env.ABLY_API_KEY,
});

// Helper to generate token requests for authenticated clients
export const createAblyTokenRequest = async (clientId) => {
	if (!process.env.ABLY_API_KEY) {
		throw new Error("ABLY_API_KEY is not configured on the server");
	}

	return ably.auth.createTokenRequest({
		clientId,
	});
};

export default ably;
