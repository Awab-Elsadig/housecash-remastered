import mongoose from "mongoose";

export const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("MongoDB Connected");
	} catch (error) {
		console.log("Error Connecting to MongoDB, Error: ", error);
		process.exit(1);
	}
};
