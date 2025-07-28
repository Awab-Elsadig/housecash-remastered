import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo"; // for storing sessions in MongoDB
import { connectDB } from "./src/db/connectDB.js";
import authRoutes from "./src/routes/auth.route.js";
import validationRoutes from "./src/routes/validation.route.js";
import houseRoutes from "./src/routes/house.route.js";
import userRoutes from "./src/routes/user.route.js";
import itemRoutes from "./src/routes/item.route.js";
import adminRoutes from "./src/routes/admin.route.js"; // new admin routes
import paymentTransactionRoutes from "./src/routes/paymentTransaction.route.js";
import notificationRoutes from "./src/routes/notification.route.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(
	cors({
		origin: process.env.ORIGIN || ["http://localhost:3000", "http://localhost:5173"],
		credentials: true,
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
			mongoUrl: process.env.MONGO_URI,
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

app.use("/api/auth", authRoutes);
app.use("/api/validate", validationRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment-transactions", paymentTransactionRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(process.env.PORT, () => {
	console.log(`Server is running on port ${process.env.PORT}`);
});
