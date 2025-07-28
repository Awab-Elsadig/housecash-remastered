// Node.js socket test script
import { io } from "socket.io-client";

console.log("Starting socket test...");

const socket = io("http://localhost:5000", {
	withCredentials: true,
	transports: ["websocket", "polling"],
});

socket.on("connect", () => {
	console.log("✅ Connected to socket server with ID:", socket.id);

	// Test the SendFetch functionality
	console.log("📤 Sending SendFetch event...");
	socket.emit("SendFetch");
});

socket.on("disconnect", () => {
	console.log("❌ Disconnected from socket server");
});

socket.on("connect_error", (error) => {
	console.error("❌ Connection error:", error.message);
});

socket.on("ReceiveFetch", () => {
	console.log("✅ Received ReceiveFetch event!");
	console.log("🎉 Socket functionality is working correctly!");

	// Disconnect after successful test
	setTimeout(() => {
		socket.disconnect();
		process.exit(0);
	}, 1000);
});

// Timeout if no response
setTimeout(() => {
	console.log("⏰ Test timeout - no ReceiveFetch event received");
	socket.disconnect();
	process.exit(1);
}, 5000);
