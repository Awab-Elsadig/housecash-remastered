import mongoose from "mongoose";

export const connectDB = async () => {
	console.log("=== DATABASE CONNECTION ATTEMPT ===");
	console.log("Environment:", process.env.NODE_ENV);
	console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
	console.log("MONGO_URI length:", process.env.MONGO_URI?.length);
	
	const primaryUri = process.env.MONGO_URI;
	const fallbackUri = process.env.MONGO_URI_FALLBACK || "mongodb://127.0.0.1:27017/housecash";

	if (!primaryUri) {
		console.error("MONGO_URI is not set. Please add it to your .env file.");
		throw new Error("MONGO_URI is not set");
	}

	try {
		console.log("Attempting to connect to MongoDB...");
		await mongoose.connect(primaryUri, { 
			serverSelectionTimeoutMS: 15000,
			connectTimeoutMS: 15000,
			socketTimeoutMS: 15000
		});
		console.log("MongoDB Connected successfully!");
		return;
	} catch (error) {
		console.error("=== MONGODB CONNECTION ERROR ===");
		console.error("Error message:", error?.message);
		console.error("Error code:", error?.code);
		console.error("Error name:", error?.name);
		console.error("Error stack:", error?.stack);
		console.error("Full error object:", error);
		console.error("=== END MONGODB CONNECTION ERROR ===");
		
		const code = error?.code || error?.cause?.code;
		const isSrvDnsIssue = code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ENODATA";
		
		// If SRV DNS lookup failed (common on some networks), try a fallback URI
		if (isSrvDnsIssue) {
			console.warn("Detected SRV/DNS issue with MongoDB URI. Attempting fallback URI...");
			try {
				await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 8000 });
				console.log("MongoDB Connected (fallback URI)");
				return;
			} catch (fallbackError) {
				console.error("Fallback MongoDB connection failed:", fallbackError?.message || fallbackError);
				throw fallbackError;
			}
		}

		// If we got here, throw the error instead of exiting
		throw error;
	}
};
