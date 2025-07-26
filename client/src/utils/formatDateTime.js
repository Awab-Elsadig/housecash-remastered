/**
 * Format a date string or Date object to a readable format
 * @param {string|Date} dateInput - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
const formatDateTime = (dateInput, options = {}) => {
	if (!dateInput) return "N/A";

	const date = new Date(dateInput);

	// Check if date is valid
	if (isNaN(date.getTime())) {
		return "Invalid Date";
	}

	const {
		includeTime = false,
		includeSeconds = false,
		dateStyle = "short", // 'short', 'medium', 'long', 'full'
		timeStyle = "short", // 'short', 'medium', 'long'
		locale = "en-US",
	} = options;

	try {
		if (includeTime) {
			return new Intl.DateTimeFormat(locale, {
				dateStyle: dateStyle,
				timeStyle: includeSeconds ? "medium" : timeStyle,
			}).format(date);
		} else {
			return new Intl.DateTimeFormat(locale, {
				dateStyle: dateStyle,
			}).format(date);
		}
	} catch {
		// Fallback for older browsers
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		if (includeTime) {
			const hours = String(date.getHours()).padStart(2, "0");
			const minutes = String(date.getMinutes()).padStart(2, "0");
			const seconds = String(date.getSeconds()).padStart(2, "0");

			if (includeSeconds) {
				return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
			} else {
				return `${month}/${day}/${year} ${hours}:${minutes}`;
			}
		} else {
			return `${month}/${day}/${year}`;
		}
	}
};

/**
 * Format date to relative time (e.g., "2 hours ago", "yesterday")
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateInput) => {
	if (!dateInput) return "N/A";

	const date = new Date(dateInput);
	const now = new Date();
	const diffInSeconds = Math.floor((now - date) / 1000);

	if (diffInSeconds < 60) {
		return "Just now";
	} else if (diffInSeconds < 3600) {
		const minutes = Math.floor(diffInSeconds / 60);
		return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
	} else if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600);
		return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
	} else if (diffInSeconds < 604800) {
		const days = Math.floor(diffInSeconds / 86400);
		return `${days} day${days !== 1 ? "s" : ""} ago`;
	} else {
		return formatDateTime(date, { dateStyle: "short" });
	}
};

/**
 * Format date for form inputs (YYYY-MM-DD)
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateForInput = (dateInput) => {
	if (!dateInput) return "";

	const date = new Date(dateInput);
	if (isNaN(date.getTime())) return "";

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

/**
 * Get time ago in a short format (e.g., "2h", "3d", "1w")
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Short relative time string
 */
export const getTimeAgoShort = (dateInput) => {
	if (!dateInput) return "";

	const date = new Date(dateInput);
	const now = new Date();
	const diffInSeconds = Math.floor((now - date) / 1000);

	if (diffInSeconds < 60) {
		return "now";
	} else if (diffInSeconds < 3600) {
		return `${Math.floor(diffInSeconds / 60)}m`;
	} else if (diffInSeconds < 86400) {
		return `${Math.floor(diffInSeconds / 3600)}h`;
	} else if (diffInSeconds < 604800) {
		return `${Math.floor(diffInSeconds / 86400)}d`;
	} else if (diffInSeconds < 2419200) {
		return `${Math.floor(diffInSeconds / 604800)}w`;
	} else {
		return `${Math.floor(diffInSeconds / 2419200)}mo`;
	}
};

export default formatDateTime;
