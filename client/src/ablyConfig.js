import { Realtime } from "ably";

// Create Ably instance
const ably = new Realtime({
	key: import.meta.env.VITE_ABLY_API_KEY,
	clientId: Math.random().toString(36).substring(2, 15), // Generate random client ID
});

// Connection state logging
ably.connection.on("connected", () => {
	console.log("Connected to Ably");
});

ably.connection.on("disconnected", () => {
	console.log("Disconnected from Ably");
});

ably.connection.on("failed", (error) => {
	console.error("Ably connection failed:", error);
});

export default ably;
