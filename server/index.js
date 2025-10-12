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
	'https://housecash-server.vercel.app',
	'https://housecash.vercel.app/', // Add trailing slash variant
	'https://housecash-server.vercel.app/' // Add trailing slash variant
];

app.use(cors({
	origin: function (origin, callback) {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) {
			return callback(null, true);
		}
		
		if (allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			// In production, be more permissive for Vercel domains
			if (isProduction && origin && origin.includes('vercel.app')) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
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

// Connect to database with retry mechanism
const connectWithRetry = async (retries = 3) => {
	for (let i = 0; i < retries; i++) {
		try {
			console.log(`=== DATABASE CONNECTION ATTEMPT ${i + 1}/${retries} ===`);
			await connectDB();
			console.log("Database connected successfully!");
			return;
		} catch (error) {
			console.error(`=== DATABASE CONNECTION FAILED (Attempt ${i + 1}) ===`);
			console.error("Error:", error.message);
			console.error("Error code:", error.code);
			console.error("Error name:", error.name);
			console.error("Full error:", error);
			console.error("=== END DATABASE CONNECTION ERROR ===");
			
			if (i === retries - 1) {
				console.error("All database connection attempts failed");
				return;
			}
			
			console.log(`Retrying database connection in 2 seconds...`);
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}
};

connectWithRetry();

// Debug: Check what's in the database on startup
const checkDatabaseContents = async () => {
	try {
		const { Item } = await import("./src/models/item.model.js");
		const { User } = await import("./src/models/user.model.js");
		
		const totalItems = await Item.countDocuments();
		const totalUsers = await User.countDocuments();
		
		console.log("=== DATABASE CONTENTS CHECK ===");
		console.log("Total items in database:", totalItems);
		console.log("Total users in database:", totalUsers);
		
		if (totalItems > 0) {
			const sampleItems = await Item.find({}).limit(5).select('name houseCode author').lean();
			console.log("Sample items:", sampleItems);
		}
		
		if (totalUsers > 0) {
			const sampleUsers = await User.find({}).limit(5).select('email houseCode').lean();
			console.log("Sample users:", sampleUsers);
		}
		console.log("=== END DATABASE CONTENTS CHECK ===");
	} catch (error) {
		console.error("Error checking database contents:", error);
	}
};

// Check database contents after connection
setTimeout(checkDatabaseContents, 2000);

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
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (1 week)
		},
	})
);


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

// Simple health check - moved to end so it doesn't interfere with API routes
app.get("/", (req, res) => {
	res.json({ 
		message: "HouseCash Server is running!", 
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || "development",
		corsOrigins: allowedOrigins,
		databaseStatus: mongoose.connection.readyState,
		databaseStates: {
			0: "disconnected",
			1: "connected", 
			2: "connecting",
			3: "disconnecting"
		}
	});
});

// Database test endpoint
app.get("/test-db", async (req, res) => {
	try {
		console.log("=== DATABASE TEST ENDPOINT ===");
		console.log("Database connection state:", mongoose.connection.readyState);
		
		if (mongoose.connection.readyState !== 1) {
			console.log("Database not connected, attempting connection...");
			await mongoose.connect(process.env.MONGO_URI, { 
				serverSelectionTimeoutMS: 10000,
				connectTimeoutMS: 10000
			});
		}
		
		// Test a simple database operation
		const { User } = await import("./src/models/user.model.js");
		const userCount = await User.countDocuments();
		
		res.json({
			status: "success",
			databaseConnected: mongoose.connection.readyState === 1,
			connectionState: mongoose.connection.readyState,
			userCount: userCount,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error("Database test failed:", error);
		res.status(500).json({
			status: "error",
			error: error.message,
			databaseConnected: mongoose.connection.readyState === 1,
			connectionState: mongoose.connection.readyState
		});
	}
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`✓ Server running on port ${PORT}`);
	console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
	console.log(`✓ Database: ${mongoose.connection.readyState === 1 ? "connected" : "disconnected"}`);
});
