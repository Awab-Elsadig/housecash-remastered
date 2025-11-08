import mongoose from "mongoose";

export const connectDB = async () => {
	const primaryUri = process.env.MONGO_URI;
	// Default database name is "theDatabase" - can be overridden with MONGO_DB_NAME env var
	const dbName = process.env.MONGO_DB_NAME || "theDatabase";
	const fallbackUri = process.env.MONGO_URI_FALLBACK || `mongodb://127.0.0.1:27017/${dbName}`;

	if (!primaryUri) {
		console.warn("⚠️  MONGO_URI is not set. Database features will be disabled.");
		throw new Error("MONGO_URI is not set");
	}

	try {
		await mongoose.connect(primaryUri, { 
			dbName: dbName, // Explicitly specify database name
			serverSelectionTimeoutMS: 15000,
			connectTimeoutMS: 15000,
			socketTimeoutMS: 15000
		});
		console.log(`✅ Connected to Database: ${dbName}`);
		return;
	} catch (error) {
		const code = error?.code || error?.cause?.code;
		const isSrvDnsIssue = code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ENODATA";
		
		// If SRV DNS lookup failed (common on some networks), try a fallback URI
		if (isSrvDnsIssue) {
			try {
				await mongoose.connect(fallbackUri, { 
					dbName: dbName, // Explicitly specify database name for fallback too
					serverSelectionTimeoutMS: 8000 
				});
				console.log(`✅ Connected to Database (fallback URI): ${dbName}`);
				return;
			} catch (fallbackError) {
				console.error("❌ Database connection failed:", fallbackError?.message || fallbackError);
				throw fallbackError;
			}
		}

		console.error("❌ Database connection failed:", error?.message || error);
		throw error;
	}
};
