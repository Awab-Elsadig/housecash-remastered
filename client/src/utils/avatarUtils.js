/**
 * Avatar utility functions for consistent profile picture handling
 */

/**
 * Get user initials from their name
 * @param {string} name - User's full name
 * @returns {string} - User initials (max 2 characters)
 */
export const getUserInitials = (name) => {
	if (!name || typeof name !== "string") return "??";

	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
};

/**
 * Get the appropriate avatar source (image URL or initials)
 * @param {Object} user - User object
 * @returns {Object} - Avatar data with type and source
 */
export const getAvatarData = (user) => {
	const defaultImage = "https://thumbs.dreamstime.com/b/web-269268516.jpg";

	if (!user) {
		return {
			type: "initials",
			source: "??",
			fallback: defaultImage,
		};
	}

	if (user.profilePictureUrl && user.profilePictureUrl.trim()) {
		return {
			type: "image",
			source: user.profilePictureUrl,
			fallback: defaultImage,
			initials: getUserInitials(user.name),
		};
	}

	return {
		type: "initials",
		source: getUserInitials(user.name),
		fallback: defaultImage,
	};
};

/**
 * Generate a consistent color for user initials based on their name
 * @param {string} name - User's name
 * @returns {string} - CSS gradient or color
 */
export const getAvatarColor = (name) => {
	if (!name) return "linear-gradient(135deg, #6366f1, #8b5cf6)";

	// Generate a hash from the name
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Convert to colors
	const colors = [
		"linear-gradient(135deg, #ef4444, #f97316)", // red-orange
		"linear-gradient(135deg, #3b82f6, #6366f1)", // blue-indigo
		"linear-gradient(135deg, #10b981, #059669)", // green
		"linear-gradient(135deg, #8b5cf6, #a855f7)", // purple
		"linear-gradient(135deg, #f59e0b, #d97706)", // yellow-orange
		"linear-gradient(135deg, #06b6d4, #0891b2)", // cyan
		"linear-gradient(135deg, #ec4899, #be185d)", // pink
	];

	return colors[Math.abs(hash) % colors.length];
};
