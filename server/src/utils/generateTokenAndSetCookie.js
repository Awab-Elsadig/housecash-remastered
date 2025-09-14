import jwt from "jsonwebtoken";

function generateTokenAndSetCookie(res, userID) {
	const token = jwt.sign({ userID }, process.env.JWT_SECRET, {
		expiresIn: "7d", // JWT token expires in 7 days
	});

	const isProduction = process.env.NODE_ENV === "production";
	const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

	// Set cookie with environment-appropriate settings
	res.cookie("token", token, {
		httpOnly: true,
		expires: new Date(Date.now() + oneWeekInMs), // 7 days
		secure: isProduction, // Only secure in production
		sameSite: isProduction ? "none" : "lax", // Different sameSite for local vs production
		maxAge: oneWeekInMs, // 7 days
	});

	return token;
}

export default generateTokenAndSetCookie;
