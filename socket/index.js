import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// Parse the ORIGIN environment variable to handle multiple origins
const allowedOrigins = process.env.ORIGIN 
	? process.env.ORIGIN.split(',').map(origin => origin.trim())
	: ["http://localhost:3000", "http://localhost:5173"];

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	})
);

// Routes
app.get("/test", (req, res) => {
	res.send("Hello World!");
});

// Socket.IO setup
const io = new Server(server, {
	cors: {
		origin: allowedOrigins,
		credentials: true,
	},
});

// Server listener
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
	console.log(`Socket server is running on port ${PORT}`);
	console.log(`Local: http://localhost:${PORT}`);
	console.log(`Network: http://0.0.0.0:${PORT}`);
});

// Socket.IO connection handler
io.on("connection", (socket) => {
	console.log("A user connected");

	// Handle 'SendFetch' event
	socket.on("SendFetch", () => {
		console.log("Received fetch request");
		io.emit("ReceiveFetch");
	});

	// Handle disconnection
	socket.on("disconnect", () => {
		console.log("User disconnected");
	});
});
