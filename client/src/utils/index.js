// Date and time utilities
export { default as formatDateTime } from "./formatDateTime.js";
export { formatRelativeTime, formatDateForInput, getTimeAgoShort } from "./formatDateTime.js";

// Currency and number formatting
export { default as formatCurrency } from "./formatCurrency.js";
export { formatCurrencyAbbreviated, formatPercentage, parseCurrency, formatNumber } from "./formatCurrency.js";

// Avatar utilities
export { getUserInitials, getAvatarData, getAvatarColor } from "./avatarUtils.js";

// ImageKit utilities
export { isValidImageKitUrl, getOptimizedImageUrl, getProfilePictureUrl, preloadImage } from "./imagekitUtils.js";

// String utilities
export {
	getFirstName,
	getInitials,
	capitalize,
	titleCase,
	truncate,
	toKebabCase,
	toCamelCase,
	generateRandomString,
	removeSpecialChars,
	isValidEmail,
	escapeHtml,
	getDisplayName,
	getUsernameOrFallback,
} from "./stringUtils.js";

// Validation utilities
export {
	validateRequired,
	validateEmail,
	validatePassword,
	validatePasswordConfirmation,
	validateNumber,
	validateCurrency,
	validateStringLength,
	validateDate,
	validateForm,
	validationRules,
} from "./validation.js";

// General helper utilities
export {
	debounce,
	throttle,
	deepClone,
	deepEqual,
	generateId,
	sleep,
	retryWithBackoff,
	groupBy,
	multiSort,
	removeDuplicates,
	isEmpty,
	getNestedValue,
	setNestedValue,
	formatFileSize,
	copyToClipboard,
} from "./helpers.js";
