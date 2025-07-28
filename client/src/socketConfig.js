// Socket configuration for dedicated socket server
import { io } from "socket.io-client";

// Connect to dedicated socket server
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
	withCredentials: true,
	autoConnect: false, // Don't auto-connect immediately
	transports: ["websocket", "polling"], // Fallback to polling if websocket fails
});

// Connection event handlers
socket.on("connect", () => {});

socket.on("disconnect", () => {});

socket.on("connect_error", (error) => {
	console.error("Socket connection error:", error);
});

export default socket;
