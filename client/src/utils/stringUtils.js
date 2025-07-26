/**
 * Get the first name from a full name string
 * @param {string} fullName - The full name string
 * @returns {string} First name only
 */
export const getFirstName = (fullName) => {
	if (!fullName || typeof fullName !== "string") {
		return "Unknown";
	}

	const trimmed = fullName.trim();
	if (!trimmed) {
		return "Unknown";
	}

	return trimmed.split(" ")[0];
};

/**
 * Get initials from a name string
 * @param {string} name - The name string
 * @param {number} maxInitials - Maximum number of initials to return
 * @returns {string} Initials (e.g., "JD" for "John Doe")
 */
export const getInitials = (name, maxInitials = 2) => {
	if (!name || typeof name !== "string") {
		return "?";
	}

	const words = name.trim().split(" ");
	const initials = words
		.slice(0, maxInitials)
		.map((word) => word.charAt(0).toUpperCase())
		.join("");

	return initials || "?";
};

/**
 * Capitalize the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
	if (!str || typeof str !== "string") {
		return "";
	}

	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize the first letter of each word
 * @param {string} str - The string to title case
 * @returns {string} Title cased string
 */
export const titleCase = (str) => {
	if (!str || typeof str !== "string") {
		return "";
	}

	return str
		.toLowerCase()
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

/**
 * Truncate a string to a specified length
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated (default: "...")
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength, suffix = "...") => {
	if (!str || typeof str !== "string") {
		return "";
	}

	if (str.length <= maxLength) {
		return str;
	}

	return str.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Convert string to kebab-case
 * @param {string} str - The string to convert
 * @returns {string} Kebab-cased string
 */
export const toKebabCase = (str) => {
	if (!str || typeof str !== "string") {
		return "";
	}

	return str
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.toLowerCase();
};

/**
 * Convert string to camelCase
 * @param {string} str - The string to convert
 * @returns {string} CamelCased string
 */
export const toCamelCase = (str) => {
	if (!str || typeof str !== "string") {
		return "";
	}

	return str
		.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
			return index === 0 ? word.toLowerCase() : word.toUpperCase();
		})
		.replace(/\s+/g, "");
};

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the random string
 * @param {string} chars - Characters to use for generation
 * @returns {string} Random string
 */
export const generateRandomString = (
	length = 8,
	chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
) => {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

/**
 * Remove special characters from a string
 * @param {string} str - The string to clean
 * @param {string} replacement - Character to replace special chars with
 * @returns {string} Cleaned string
 */
export const removeSpecialChars = (str, replacement = "") => {
	if (!str || typeof str !== "string") {
		return "";
	}

	return str.replace(/[^a-zA-Z0-9\s]/g, replacement);
};

/**
 * Check if a string is a valid email
 * @param {string} email - The email string to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
	if (!email || typeof email !== "string") {
		return false;
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email.trim());
};

/**
 * Escape HTML characters in a string
 * @param {string} str - The string to escape
 * @returns {string} HTML-escaped string
 */
export const escapeHtml = (str) => {
	if (!str || typeof str !== "string") {
		return "";
	}

	const htmlEscapes = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#x27;",
		"/": "&#x2F;",
	};

	return str.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
};

/**
 * Get display name with fallback options
 * @param {Object} user - User object with name, username, email properties
 * @returns {string} Best available display name
 */
export const getDisplayName = (user) => {
	if (!user || typeof user !== "object") {
		return "Unknown User";
	}

	// Try name first
	if (user.name && typeof user.name === "string" && user.name.trim()) {
		return getFirstName(user.name);
	}

	// Try username
	if (user.username && typeof user.username === "string" && user.username.trim()) {
		return user.username;
	}

	// Try email (get part before @)
	if (user.email && typeof user.email === "string" && user.email.trim()) {
		const emailPart = user.email.split("@")[0];
		return emailPart || "User";
	}

	return "Unknown User";
};

/**
 * Get username or fallback display name
 * @param {Object} user - User object
 * @returns {string} Username or fallback
 */
export const getUsernameOrFallback = (user) => {
	if (!user || typeof user !== "object") {
		return "?";
	}

	// Try username first
	if (user.username && typeof user.username === "string" && user.username.trim()) {
		return user.username;
	}

	// Try first name
	if (user.name && typeof user.name === "string" && user.name.trim()) {
		return getFirstName(user.name);
	}

	return "?";
};
