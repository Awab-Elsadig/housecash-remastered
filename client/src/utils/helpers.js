/**
 * General utility functions
 */

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
	let timeout;

	return function executedFunction(...args) {
		const later = () => {
			timeout = null;
			if (!immediate) func(...args);
		};

		const callNow = immediate && !timeout;

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);

		if (callNow) func(...args);
	};
};

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
	let inThrottle;
	return function executedFunction(...args) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
};

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (obj instanceof Date) {
		return new Date(obj.getTime());
	}

	if (obj instanceof Array) {
		return obj.map((item) => deepClone(item));
	}

	if (typeof obj === "object") {
		const cloned = {};
		Object.keys(obj).forEach((key) => {
			cloned[key] = deepClone(obj[key]);
		});
		return cloned;
	}

	return obj;
};

/**
 * Check if two objects are deeply equal
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @returns {boolean} True if objects are deeply equal
 */
export const deepEqual = (obj1, obj2) => {
	if (obj1 === obj2) {
		return true;
	}

	if (obj1 == null || obj2 == null) {
		return false;
	}

	if (typeof obj1 !== typeof obj2) {
		return false;
	}

	if (typeof obj1 !== "object") {
		return obj1 === obj2;
	}

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) {
		return false;
	}

	for (let key of keys1) {
		if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
			return false;
		}
	}

	return true;
};

/**
 * Generate a unique ID
 * @param {number} length - Length of the ID
 * @returns {string} Unique ID string
 */
export const generateId = (length = 8) => {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
	let lastError;

	for (let i = 0; i <= maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (i === maxRetries) {
				throw lastError;
			}

			const delay = baseDelay * Math.pow(2, i);
			await sleep(delay);
		}
	}
};

/**
 * Group array items by a key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key to group by
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
	if (!Array.isArray(array)) {
		return {};
	}

	return array.reduce((groups, item) => {
		const groupKey = typeof key === "function" ? key(item) : item[key];
		if (!groups[groupKey]) {
			groups[groupKey] = [];
		}
		groups[groupKey].push(item);
		return groups;
	}, {});
};

/**
 * Sort array by multiple criteria
 * @param {Array} array - Array to sort
 * @param {Array} sortBy - Array of sort criteria
 * @returns {Array} Sorted array
 */
export const multiSort = (array, sortBy) => {
	if (!Array.isArray(array) || !Array.isArray(sortBy)) {
		return array;
	}

	return [...array].sort((a, b) => {
		for (let { key, direction = "asc" } of sortBy) {
			let aVal = typeof key === "function" ? key(a) : a[key];
			let bVal = typeof key === "function" ? key(b) : b[key];

			// Handle null/undefined values
			if (aVal == null && bVal == null) continue;
			if (aVal == null) return direction === "asc" ? 1 : -1;
			if (bVal == null) return direction === "asc" ? -1 : 1;

			// Convert to comparable types
			if (typeof aVal === "string") aVal = aVal.toLowerCase();
			if (typeof bVal === "string") bVal = bVal.toLowerCase();

			if (aVal < bVal) return direction === "asc" ? -1 : 1;
			if (aVal > bVal) return direction === "asc" ? 1 : -1;
		}
		return 0;
	});
};

/**
 * Remove duplicates from array
 * @param {Array} array - Array with potential duplicates
 * @param {string|Function} key - Key to check for uniqueness
 * @returns {Array} Array without duplicates
 */
export const removeDuplicates = (array, key) => {
	if (!Array.isArray(array)) {
		return [];
	}

	if (!key) {
		return [...new Set(array)];
	}

	const seen = new Set();
	return array.filter((item) => {
		const keyValue = typeof key === "function" ? key(item) : item[key];
		if (seen.has(keyValue)) {
			return false;
		}
		seen.add(keyValue);
		return true;
	});
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
export const isEmpty = (value) => {
	if (value == null) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object") return Object.keys(value).length === 0;
	return false;
};

/**
 * Safely get nested object property
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path (e.g., 'user.profile.name')
 * @param {any} defaultValue - Default value if path doesn't exist
 * @returns {any} Value at path or default value
 */
export const getNestedValue = (obj, path, defaultValue = undefined) => {
	if (!obj || typeof obj !== "object" || !path) {
		return defaultValue;
	}

	const keys = path.split(".");
	let current = obj;

	for (let key of keys) {
		if (current == null || typeof current !== "object" || !(key in current)) {
			return defaultValue;
		}
		current = current[key];
	}

	return current;
};

/**
 * Safely set nested object property
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 * @returns {Object} Modified object
 */
export const setNestedValue = (obj, path, value) => {
	if (!obj || typeof obj !== "object" || !path) {
		return obj;
	}

	const keys = path.split(".");
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (!(key in current) || typeof current[key] !== "object") {
			current[key] = {};
		}
		current = current[key];
	}

	current[keys[keys.length - 1]] = value;
	return obj;
};

/**
 * Convert file size to human readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Human readable file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		} else {
			// Fallback for older browsers
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.style.position = "fixed";
			textArea.style.left = "-999999px";
			textArea.style.top = "-999999px";
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			const result = document.execCommand("copy");
			document.body.removeChild(textArea);
			return result;
		}
	} catch {
		return false;
	}
};
