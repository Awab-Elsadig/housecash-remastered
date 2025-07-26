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
app.use(
	cors({
		origin: process.env.ORIGIN || ["http://localhost:3000", "http://localhost:5173"],
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
		origin: process.env.ORIGIN || ["http://localhost:3000", "http://localhost:5173"],
		credentials: true,
	},
});

// Server listener
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Socket server is running on port ${PORT}`);
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
