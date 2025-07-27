/**
 * Format a date string or Date object to a smart readable format
 * Today: 9:32 PM
 * Yesterday: Yesterday
 * This year: 12-Jul
 * Previous years: 12-Jul-23
 * @param {string|Date} dateInput - The date to format
 * @returns {string} Formatted date string
 */
const formatDateTime = (dateInput) => {
	if (!dateInput) return "N/A";

	const date = new Date(dateInput);

	// Check if date is valid
	if (isNaN(date.getTime())) {
		return "Invalid Date";
	}

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	// Check if it's today
	if (inputDate.getTime() === today.getTime()) {
		// Return time in format like "9:32 PM"
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	}

	// Check if it's yesterday
	if (inputDate.getTime() === yesterday.getTime()) {
		return "Yesterday";
	}

	// For other dates, show in "12-Jul" or "12-Jul-23" format
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const day = date.getDate();
	const month = months[date.getMonth()];

	// If it's current year, show "12-Jul"
	if (date.getFullYear() === now.getFullYear()) {
		return `${day}-${month}`;
	}

	// If it's previous year, show "12-Jul-23"
	const year = date.getFullYear().toString().slice(-2);
	return `${day}-${month}-${year}`;
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
