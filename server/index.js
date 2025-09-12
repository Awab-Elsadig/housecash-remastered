import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo"; // for storing sessions in MongoDB
import mongoose from "mongoose";
import { connectDB } from "./src/db/connectDB.js";
import authRoutes from "./src/routes/auth.route.js";
import validationRoutes from "./src/routes/validation.route.js";
import houseRoutes from "./src/routes/house.route.js";
import userRoutes from "./src/routes/user.route.js";
import itemRoutes from "./src/routes/item.route.js";
import adminRoutes from "./src/routes/admin.route.js"; // new admin routes
import paymentTransactionRoutes from "./src/routes/paymentTransaction.route.js";
import notificationRoutes from "./src/routes/notification.route.js";
import uploadRoutes from "./src/routes/upload.route.js";
import settlementRoutes from "./src/routes/settlement.route.js";
import cookieParser from "cookie-parser";
import paymentRoutes from "./src/routes/payment.route.js";
import paymentApprovalRoutes from "./src/routes/paymentApproval.route.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// CORS: allow multiple known origins incl. local dev
const envOrigins = (process.env.ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
const allowedOrigins = [
	...envOrigins,
	"https://housecash.vercel.app", // Production frontend
	"http://localhost:3000",
	"http://localhost:5173",
	"http://127.0.0.1:3000",
	"http://127.0.0.1:5173",
].filter(Boolean);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
	cors({
		origin: (origin, callback) => {
			console.log(`CORS request from origin: ${origin}`);
			// Allow non-browser requests (no origin) and whitelisted origins
			if (!origin || allowedOrigins.includes(origin)) {
				console.log(`CORS: Allowing origin ${origin}`);
				return callback(null, true);
			}
			console.log(`CORS: Blocking origin ${origin}`);
			return callback(new Error(`Not allowed by CORS: ${origin}`));
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
	})
);

app.use(cookieParser());

await connectDB();

// Trust first proxy
app.set("trust proxy", 1);

// Setup session middleware with persistent store and proper cookie settings
app.use(
	session({
		secret: process.env.SESSION_SECRET || "your_secret_key",
		resave: false,
		saveUninitialized: false,
		store: MongoStore.create({
			// Reuse the active mongoose client (supports fallback URIs)
			client: mongoose.connection.getClient(),
		}),
		cookie: {
			secure: false,
			sameSite: "lax",
			maxAge: 1000 * 60 * 60 * 24, // 1 day
		},
	})
);

// Add session debug middleware
app.use((req, res, next) => {
	if (req.path.includes("resolve-balance")) {
		console.log(`Request to resolve-balance: ${req.method} ${req.path}`);
		console.log("Request body:", req.body);
		console.log("Request headers:", req.headers);
	}
	next();
});

// Routes
app.use("/test", (req, res) => {
	res.send("Hello World!");
});

// CORS test endpoint
app.use("/cors-test", (req, res) => {
	res.json({
		message: "CORS test successful",
		origin: req.headers.origin,
		allowedOrigins: allowedOrigins
	});
});

app.use("/api/auth", authRoutes);
app.use("/api/validate", validationRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment-transactions", paymentTransactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-approvals", paymentApprovalRoutes);

app.listen(process.env.PORT, () => {
	console.log(`Server is running on port ${process.env.PORT}`);
	console.log("CORS allowed origins:", allowedOrigins);
});
