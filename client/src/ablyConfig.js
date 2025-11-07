import { Realtime } from "ably";

const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:5000" : "https://housecash-server.vercel.app";
const baseApiUrl = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/$/, "");

// Create Ably instance using server-issued tokens
const ably = new Realtime({
	authUrl: `${baseApiUrl}/api/ably/token`,
	authMethod: "GET",
	withCredentials: true,
	queryTime: true,
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
