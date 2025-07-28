import Ably from "ably";
import dotenv from "dotenv";

dotenv.config();

// Create Ably instance for server-side operations
const ably = new Ably.Realtime({
	key: process.env.ABLY_API_KEY,
});

// Connection state logging
ably.connection.on("connected", () => {
	console.log("Server connected to Ably");
});

ably.connection.on("disconnected", () => {
	console.log("Server disconnected from Ably");
});

ably.connection.on("failed", (error) => {
	console.error("Server Ably connection failed:", error);
});

export default ably;
