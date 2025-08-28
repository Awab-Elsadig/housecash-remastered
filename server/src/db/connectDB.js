import mongoose from "mongoose";

export const connectDB = async () => {
	const primaryUri = process.env.MONGO_URI;
	const fallbackUri = process.env.MONGO_URI_FALLBACK || "mongodb://127.0.0.1:27017/housecash";

	if (!primaryUri) {
		console.error("MONGO_URI is not set. Please add it to your .env file.");
		process.exit(1);
	}

	try {
		await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 10000 });
		console.log("MongoDB Connected");
		return;
	} catch (error) {
		const code = error?.code || error?.cause?.code;
		const isSrvDnsIssue = code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ENODATA";
		console.error("Error connecting to MongoDB (primary):", error?.message || error);

		// If SRV DNS lookup failed (common on some networks), try a fallback URI
		if (isSrvDnsIssue) {
			console.warn("Detected SRV/DNS issue with MongoDB URI. Attempting fallback URI...");
			try {
				await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 8000 });
				console.log("MongoDB Connected (fallback URI)");
				return;
			} catch (fallbackError) {
				console.error("Fallback MongoDB connection failed:", fallbackError?.message || fallbackError);
			}
		}

		// If we got here, fail hard
		process.exit(1);
	}
};
