import jwt from "jsonwebtoken";

function generateTokenAndSetCookie(res, userID) {
	const token = jwt.sign({ userID }, process.env.JWT_SECRET, {
		expiresIn: "7d", // JWT token expires in 7 days
	});

	const isProduction = process.env.NODE_ENV === "production";
	const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

	// Set cookie with iOS Safari compatible settings
	const cookieOptions = {
		httpOnly: true,
		expires: new Date(Date.now() + oneWeekInMs), // 7 days
		maxAge: oneWeekInMs, // 7 days
		path: "/", // Explicitly set path
	};

	// iOS Safari requires specific cookie settings
	if (isProduction) {
		// Production: Use secure and sameSite none for cross-origin requests
		cookieOptions.secure = true;
		cookieOptions.sameSite = "none";
	} else {
		// Development: Use lax for same-origin requests
		cookieOptions.secure = false;
		cookieOptions.sameSite = "lax";
	}

	console.log("Setting cookie with options:", cookieOptions);
	res.cookie("token", token, cookieOptions);

	// Also set a backup cookie with different settings for iOS compatibility
	if (isProduction) {
		res.cookie("token_backup", token, {
			httpOnly: true,
			expires: new Date(Date.now() + oneWeekInMs),
			maxAge: oneWeekInMs,
			path: "/",
			secure: true,
			sameSite: "lax", // Try lax as backup
		});
	}

	// Set additional cookies for iOS Safari compatibility
	res.cookie("auth_token", token, {
		httpOnly: false, // Allow JavaScript access for debugging
		expires: new Date(Date.now() + oneWeekInMs),
		maxAge: oneWeekInMs,
		path: "/",
		secure: isProduction,
		sameSite: isProduction ? "none" : "lax",
	});

	// Set a non-httpOnly cookie for debugging
	res.cookie("debug_auth", "true", {
		httpOnly: false,
		expires: new Date(Date.now() + oneWeekInMs),
		maxAge: oneWeekInMs,
		path: "/",
		secure: isProduction,
		sameSite: isProduction ? "none" : "lax",
	});

	return token;
}

export default generateTokenAndSetCookie;
