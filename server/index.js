import dotenv from "dotenv";
import express from "express";
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
import settlementRoutes from "./src/routes/settlement.route.js";
import cookieParser from "cookie-parser";
import paymentRoutes from "./src/routes/payment.route.js";
import paymentApprovalRoutes from "./src/routes/paymentApproval.route.js";
import ablyRoutes from "./src/routes/ably.route.js";

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Trust first proxy (needed for Vercel)
app.set("trust proxy", 1);

// CORS configuration - handle preflight requests first
const allowedOrigins = [
	'http://localhost:3000',
	'http://localhost:5173',
	'https://housecash.vercel.app',
	'https://housecash-server.vercel.app',
];

// Helper function to check if origin is allowed
const isOriginAllowed = (origin) => {
	if (!origin) return true; // Allow requests with no origin
	
	// Normalize origin (remove trailing slash)
	const normalizedOrigin = origin.replace(/\/$/, '');
	
	// Check exact match
	if (allowedOrigins.includes(normalizedOrigin)) {
		return true;
	}
	
	// In production, allow any Vercel domain
	if (isProduction && normalizedOrigin.includes('vercel.app')) {
		return true;
	}
	
	return false;
};

// CORS middleware - must be applied to ALL requests including OPTIONS
// This MUST be the first middleware after trust proxy
app.use((req, res, next) => {
	const origin = req.headers.origin;
	const method = req.method;
	
	// Handle preflight OPTIONS requests
	if (method === 'OPTIONS') {
		if (isOriginAllowed(origin)) {
			// Set CORS headers for preflight
			if (origin) {
				res.setHeader('Access-Control-Allow-Origin', origin);
			}
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
			res.setHeader('Access-Control-Allow-Credentials', 'true');
			res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
			return res.status(200).end();
		} else {
			console.warn(`[CORS] OPTIONS request rejected for origin: ${origin}`);
			return res.status(403).end();
		}
	}
	
	// Handle actual requests
	if (isOriginAllowed(origin)) {
		// Set CORS headers for actual requests
		if (origin) {
			res.setHeader('Access-Control-Allow-Origin', origin);
		}
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
	} else {
		console.warn(`[CORS] Request rejected for origin: ${origin}`);
		return res.status(403).json({ error: 'Not allowed by CORS' });
	}
	
	next();
});

// Middleware
app.use(express.json());
app.use(cookieParser());

// Connect to database with retry mechanism
const connectWithRetry = async (retries = 3) => {
	// Skip connection attempts if MONGO_URI is not set
	if (!process.env.MONGO_URI) {
		console.warn("⚠️  MONGO_URI not set - database features disabled");
		return;
	}
	
	for (let i = 0; i < retries; i++) {
		try {
			await connectDB();
			return;
		} catch (error) {
			// If error is about missing MONGO_URI, don't retry
			if (error.message === "MONGO_URI is not set") {
				return;
			}
			
			if (i === retries - 1) {
				console.error(`❌ Database connection failed after ${retries} attempts:`, error.message);
				return;
			}
			
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}
};

connectWithRetry();


// Setup session middleware with persistent store and proper cookie settings
// Use MongoStore if MongoDB is configured, otherwise use memory store
const sessionConfig = {
	secret: process.env.SESSION_SECRET || "your_secret_key",
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: isProduction, // Only secure in production
		sameSite: isProduction ? "none" : "lax", // Different sameSite for local vs production
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (1 week)
		httpOnly: true, // Important for security
		path: "/", // Ensure cookie is available for all paths
	},
};

// Use MongoStore if MONGO_URI is set (works even if connection isn't ready yet)
// This is critical for Vercel serverless functions where connection might be async
if (process.env.MONGO_URI) {
	try {
		// Get database name from URI or use default
		const dbName = process.env.MONGO_DB_NAME || "theDatabase";
		
		// Create MongoStore with URI directly (works even if mongoose isn't connected yet)
		// This is important for Vercel serverless functions
		sessionConfig.store = MongoStore.create({
			mongoUrl: process.env.MONGO_URI,
			dbName: dbName,
			collectionName: "sessions",
			// Auto-remove expired sessions
			autoRemove: "native",
			// Connection options
			mongoOptions: {
				serverSelectionTimeoutMS: 5000,
				connectTimeoutMS: 5000,
			},
		});
		console.log("✓ MongoStore configured for sessions");
	} catch (error) {
		console.warn("⚠️  Failed to create MongoStore:", error.message);
		console.warn("⚠️  Using memory store (sessions will be lost on restart)");
	}
} else {
	console.warn("⚠️  MONGO_URI not set, using memory store (sessions will be lost on restart)");
}

app.use(session(sessionConfig));


app.use("/api/auth", authRoutes);
app.use("/api/validate", validationRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment-transactions", paymentTransactionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-approvals", paymentApprovalRoutes);
app.use("/api/ably", ablyRoutes);

// Error handler - ensure CORS headers are set even on errors
app.use((err, req, res, next) => {
	const origin = req.headers.origin;
	
	// Set CORS headers even for error responses
	if (isOriginAllowed(origin) && origin) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Access-Control-Allow-Credentials', 'true');
	}
	
	// Log the error (only in development or for 500 errors)
	if (process.env.NODE_ENV === 'development' || err.status >= 500) {
		console.error(`[ERROR] ${err.status || 500}:`, err.message);
	}
	
	// Send error response
	res.status(err.status || 500).json({
		error: err.message || 'Internal Server Error',
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	});
});

// Simple health check - moved to end so it doesn't interfere with API routes
app.get("/", async (req, res) => {
	try {
		const { checkAblyStatus } = await import("./src/utils/ablyConfig.js");
		const ablyStatus = await checkAblyStatus();
		
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
			},
			ablyStatus: ablyStatus
		});
	} catch (error) {
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
			},
			ablyStatus: { status: "error", message: error.message }
		});
	}
});

// Database test endpoint
app.get("/test-db", async (req, res) => {
	try {
		if (mongoose.connection.readyState !== 1) {
			const dbName = process.env.MONGO_DB_NAME || "theDatabase";
			await mongoose.connect(process.env.MONGO_URI, { 
				dbName: dbName,
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

// Check Ably status on startup
const checkAblyOnStartup = async () => {
	try {
		const { checkAblyStatus } = await import("./src/utils/ablyConfig.js");
		const ablyStatus = await checkAblyStatus();
		if (ablyStatus.configured && ablyStatus.status === "ready") {
			console.log(`✅ Ably: ${ablyStatus.message}`);
		} else if (ablyStatus.configured) {
			console.warn(`⚠️  Ably: ${ablyStatus.message}`);
		} else {
			console.warn(`⚠️  Ably: ${ablyStatus.message}`);
		}
	} catch (error) {
		console.warn(`⚠️  Ably: Failed to check status - ${error.message}`);
	}
};

// Start server for local development (not on Vercel)
if (!process.env.VERCEL) {
	app.listen(PORT, async () => {
		console.log(`✓ Server running on port ${PORT}`);
		console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
		console.log(`✓ Database: ${mongoose.connection.readyState === 1 ? "connected" : "disconnected"}`);
		await checkAblyOnStartup();
	});
} else {
	// On Vercel, check Ably status after a short delay
	setTimeout(checkAblyOnStartup, 1000);
}

// Export for Vercel serverless functions
export default app;
