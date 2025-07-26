import jwt from "jsonwebtoken";

function generateTokenAndSetCookie(res, userID) {
	const token = jwt.sign({ userID }, process.env.JWT_SECRET, {
		expiresIn: "7d",
	});

	// Set cookie
	res.cookie("token", token, {
		httpOnly: true,
		expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		secure: true,
		sameSite: "none",
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});

	return token;
}

export default generateTokenAndSetCookie;
