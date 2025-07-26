/**
 * Validation utilities for forms and data
 */

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {Object} Validation result
 */
export const validateRequired = (value) => {
	const isValid = value !== null && value !== undefined && value !== "";
	return {
		isValid,
		message: isValid ? "" : "This field is required",
	};
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export const validateEmail = (email) => {
	if (!email) {
		return { isValid: false, message: "Email is required" };
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const isValid = emailRegex.test(email.trim());

	return {
		isValid,
		message: isValid ? "" : "Please enter a valid email address",
	};
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validatePassword = (password, options = {}) => {
	const {
		minLength = 8,
		requireUppercase = true,
		requireLowercase = true,
		requireNumbers = true,
		requireSpecialChars = false,
	} = options;

	if (!password) {
		return { isValid: false, message: "Password is required" };
	}

	const errors = [];

	if (password.length < minLength) {
		errors.push(`Password must be at least ${minLength} characters long`);
	}

	if (requireUppercase && !/[A-Z]/.test(password)) {
		errors.push("Password must contain at least one uppercase letter");
	}

	if (requireLowercase && !/[a-z]/.test(password)) {
		errors.push("Password must contain at least one lowercase letter");
	}

	if (requireNumbers && !/\d/.test(password)) {
		errors.push("Password must contain at least one number");
	}

	if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
		errors.push("Password must contain at least one special character");
	}

	return {
		isValid: errors.length === 0,
		message: errors.join(". "),
	};
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Object} Validation result
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
	if (!confirmPassword) {
		return { isValid: false, message: "Please confirm your password" };
	}

	const isValid = password === confirmPassword;
	return {
		isValid,
		message: isValid ? "" : "Passwords do not match",
	};
};

/**
 * Validate numeric value
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateNumber = (value, options = {}) => {
	const { min, max, allowDecimals = true, required = false } = options;

	if (!value && value !== 0) {
		return {
			isValid: !required,
			message: required ? "This field is required" : "",
		};
	}

	const numValue = parseFloat(value);

	if (isNaN(numValue)) {
		return { isValid: false, message: "Please enter a valid number" };
	}

	if (!allowDecimals && numValue % 1 !== 0) {
		return { isValid: false, message: "Please enter a whole number" };
	}

	if (min !== undefined && numValue < min) {
		return { isValid: false, message: `Value must be at least ${min}` };
	}

	if (max !== undefined && numValue > max) {
		return { isValid: false, message: `Value must be no more than ${max}` };
	}

	return { isValid: true, message: "" };
};

/**
 * Validate currency amount
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateCurrency = (value, options = {}) => {
	const { min = 0, max, required = false } = options;

	if (!value && value !== 0) {
		return {
			isValid: !required,
			message: required ? "Amount is required" : "",
		};
	}

	// Remove currency symbols and parse
	const cleanValue = typeof value === "string" ? value.replace(/[$,\s]/g, "") : value;

	const numValue = parseFloat(cleanValue);

	if (isNaN(numValue)) {
		return { isValid: false, message: "Please enter a valid amount" };
	}

	if (numValue < min) {
		return { isValid: false, message: `Amount must be at least $${min}` };
	}

	if (max !== undefined && numValue > max) {
		return { isValid: false, message: `Amount must be no more than $${max}` };
	}

	// Check for reasonable decimal places (no more than 2)
	const decimalPlaces = (numValue.toString().split(".")[1] || "").length;
	if (decimalPlaces > 2) {
		return { isValid: false, message: "Amount cannot have more than 2 decimal places" };
	}

	return { isValid: true, message: "" };
};

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateStringLength = (value, options = {}) => {
	const { min, max, required = false } = options;

	if (!value) {
		return {
			isValid: !required,
			message: required ? "This field is required" : "",
		};
	}

	const length = value.length;

	if (min !== undefined && length < min) {
		return {
			isValid: false,
			message: `Must be at least ${min} character${min !== 1 ? "s" : ""} long`,
		};
	}

	if (max !== undefined && length > max) {
		return {
			isValid: false,
			message: `Must be no more than ${max} character${max !== 1 ? "s" : ""} long`,
		};
	}

	return { isValid: true, message: "" };
};

/**
 * Validate date
 * @param {any} value - Date value to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateDate = (value, options = {}) => {
	const { min, max, required = false, futureOnly = false, pastOnly = false } = options;

	if (!value) {
		return {
			isValid: !required,
			message: required ? "Date is required" : "",
		};
	}

	const date = new Date(value);

	if (isNaN(date.getTime())) {
		return { isValid: false, message: "Please enter a valid date" };
	}

	const now = new Date();

	if (futureOnly && date <= now) {
		return { isValid: false, message: "Date must be in the future" };
	}

	if (pastOnly && date >= now) {
		return { isValid: false, message: "Date must be in the past" };
	}

	if (min && date < new Date(min)) {
		return { isValid: false, message: `Date must be after ${new Date(min).toLocaleDateString()}` };
	}

	if (max && date > new Date(max)) {
		return { isValid: false, message: `Date must be before ${new Date(max).toLocaleDateString()}` };
	}

	return { isValid: true, message: "" };
};

/**
 * Validate multiple fields at once
 * @param {Object} data - Object with field values
 * @param {Object} rules - Validation rules for each field
 * @returns {Object} Validation results
 */
export const validateForm = (data, rules) => {
	const errors = {};
	let isValid = true;

	Object.keys(rules).forEach((field) => {
		const fieldRules = rules[field];
		const value = data[field];

		for (const rule of fieldRules) {
			const result = rule(value);
			if (!result.isValid) {
				errors[field] = result.message;
				isValid = false;
				break; // Stop at first error for this field
			}
		}
	});

	return {
		isValid,
		errors,
	};
};

/**
 * Common validation rule combinations
 */
export const validationRules = {
	required: (value) => validateRequired(value),
	email: (value) => validateEmail(value),
	password: (value) => validatePassword(value),
	currency: (value) => validateCurrency(value, { required: true }),
	positiveNumber: (value) => validateNumber(value, { min: 0, required: true }),
	nonEmptyString: (value) => validateStringLength(value, { min: 1, required: true }),
};
