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

	// Respect explicit avatar mode if set
	if (user.avatarMode === "none") {
		return {
			type: "none",
			source: "",
			fallback: defaultImage,
			initials: getUserInitials(user.name),
			letters: user.initialsCount || 2,
		};
	}

	if (user.profilePictureUrl && user.profilePictureUrl.trim() && user.avatarMode !== "initials") {
		return {
			type: "image",
			source: user.profilePictureUrl,
			fallback: defaultImage,
			initials: getUserInitials(user.name).slice(0, user.initialsCount || 2),
		};
	}

	return {
		type: "initials",
		source: getUserInitials(user.name).slice(0, user.initialsCount || 2),
		fallback: defaultImage,
	};
};

/**
 * Generate a consistent color for user initials based on their name
 * @param {string} name - User's name
 * @returns {string} - CSS gradient or color
 */
export const getAvatarColor = (name) => {
	if (!name) return "linear-gradient(135deg, #3b82f6, #1d4ed8)";

	// Generate a hash from the name
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Convert to colors
	const colors = [
		"linear-gradient(135deg, #ef4444, #f97316)", // red-orange
		"linear-gradient(135deg, #3b82f6, #1d4ed8)", // blue
		"linear-gradient(135deg, #10b981, #059669)", // green
		"linear-gradient(135deg, #2563eb, #1d4ed8)", // alt blue
		"linear-gradient(135deg, #f59e0b, #d97706)", // yellow-orange
		"linear-gradient(135deg, #06b6d4, #0891b2)", // cyan
		"linear-gradient(135deg, #0ea5e9, #0284c7)", // sky blue
	];

	return colors[Math.abs(hash) % colors.length];
};
