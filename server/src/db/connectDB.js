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
		
		// Check and log Ably status after database connection
		try {
			const { checkAblyStatus } = await import("../utils/ablyConfig.js");
			const ablyStatus = await checkAblyStatus();
			if (ablyStatus.configured && ablyStatus.status === "ready") {
				console.log(`✅ Ably: ${ablyStatus.message}`);
			} else if (ablyStatus.configured) {
				console.warn(`⚠️  Ably: ${ablyStatus.message}`);
			} else {
				console.warn(`⚠️  Ably: ${ablyStatus.message}`);
			}
		} catch (ablyError) {
			console.warn(`⚠️  Ably: Failed to check status - ${ablyError.message}`);
		}
		
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
				
				// Check and log Ably status after database connection
				try {
					const { checkAblyStatus } = await import("../utils/ablyConfig.js");
					const ablyStatus = await checkAblyStatus();
					if (ablyStatus.configured && ablyStatus.status === "ready") {
						console.log(`✅ Ably: ${ablyStatus.message}`);
					} else if (ablyStatus.configured) {
						console.warn(`⚠️  Ably: ${ablyStatus.message}`);
					} else {
						console.warn(`⚠️  Ably: ${ablyStatus.message}`);
					}
				} catch (ablyError) {
					console.warn(`⚠️  Ably: Failed to check status - ${ablyError.message}`);
				}
				
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
