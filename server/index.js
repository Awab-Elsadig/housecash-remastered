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
const isProduction = process.env.NODE_ENV === "production";

// Middleware
app.use(express.json());

// CORS configuration for both development and production
const allowedOrigins = [
	'http://localhost:3000',
	'http://localhost:5173',
	'https://housecash.vercel.app',
	'https://housecash-server.vercel.app'
];

app.use(cors({
	origin: function (origin, callback) {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) return callback(null, true);
		
		if (allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			console.log('CORS blocked origin:', origin);
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
	exposedHeaders: ['Set-Cookie']
}));

app.use(cookieParser());

// Add explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
	console.log('OPTIONS preflight request from:', req.headers.origin);
	res.header('Access-Control-Allow-Origin', req.headers.origin);
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
	res.header('Access-Control-Allow-Credentials', 'true');
	res.sendStatus(200);
});

// Connect to database
connectDB().catch((error) => {
	console.error("Database connection failed:", error.message);
	// Don't crash the server, just log the error
	// The server can still handle requests, but database operations will fail
});

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
			secure: isProduction, // Only secure in production
			sameSite: isProduction ? "none" : "lax", // Different sameSite for local vs production
			maxAge: 1000 * 60 * 60 * 24, // 1 day
		},
	})
);


app.use("/api/auth", (req, res, next) => {
	console.log("=== AUTH ROUTE DEBUG ===");
	console.log("Auth route hit:", req.method, req.url);
	console.log("Origin:", req.headers.origin);
	console.log("User-Agent:", req.headers['user-agent']);
	console.log("Request body:", req.body);
	console.log("=== END AUTH ROUTE DEBUG ===");
	next();
}, authRoutes);
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

// Simple health check - moved to end so it doesn't interfere with API routes
app.use("/", (req, res) => {
	res.json({ message: "HouseCash Server is running!", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log("=== SERVER STARTUP DEBUG ===");
	console.log(`Server is running on port ${PORT}`);
	console.log("Environment:", process.env.NODE_ENV || "development");
	console.log("CORS: Allow all origins (development mode)");
	console.log("Database connection state:", mongoose.connection.readyState);
	console.log("Session secret configured:", !!process.env.SESSION_SECRET);
	console.log("MongoDB URI configured:", !!process.env.MONGODB_URI);
	console.log("=== END SERVER STARTUP DEBUG ===");
});
