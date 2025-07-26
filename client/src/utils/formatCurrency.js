/**
 * Format currency amounts consistently throughout the app
 * @param {number} amount - The amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, options = {}) => {
	if (amount === null || amount === undefined || isNaN(amount)) {
		return "$0.00";
	}

	const {
		currency = "USD",
		locale = "en-US",
		minimumFractionDigits = 2,
		maximumFractionDigits = 2,
		showSymbol = true,
	} = options;

	try {
		const formatter = new Intl.NumberFormat(locale, {
			style: showSymbol ? "currency" : "decimal",
			currency: currency,
			minimumFractionDigits,
			maximumFractionDigits,
		});

		return formatter.format(amount);
	} catch {
		// Fallback for older browsers or invalid locale/currency
		const fixed = parseFloat(amount).toFixed(minimumFractionDigits);
		return showSymbol ? `$${fixed}` : fixed;
	}
};

/**
 * Format currency with abbreviated notation (e.g., $1.2K, $1.5M)
 * @param {number} amount - The amount to format
 * @param {Object} options - Formatting options
 * @returns {string} Abbreviated currency string
 */
export const formatCurrencyAbbreviated = (amount, options = {}) => {
	if (amount === null || amount === undefined || isNaN(amount)) {
		return "$0";
	}

	const { showSymbol = true } = options;
	const absAmount = Math.abs(amount);

	let formattedAmount;
	if (absAmount >= 1000000) {
		formattedAmount = (amount / 1000000).toFixed(1) + "M";
	} else if (absAmount >= 1000) {
		formattedAmount = (amount / 1000).toFixed(1) + "K";
	} else {
		formattedAmount = amount.toFixed(2);
	}

	return showSymbol ? `$${formattedAmount}` : formattedAmount;
};

/**
 * Format percentage values
 * @param {number} value - The decimal value to format as percentage
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, options = {}) => {
	if (value === null || value === undefined || isNaN(value)) {
		return "0%";
	}

	const {
		minimumFractionDigits = 0,
		maximumFractionDigits = 1,
		multiplied = false, // Set to true if value is already multiplied by 100
	} = options;

	const percentValue = multiplied ? value : value * 100;

	try {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "percent",
			minimumFractionDigits,
			maximumFractionDigits,
		});

		return formatter.format(multiplied ? value / 100 : value);
	} catch {
		// Fallback
		return `${percentValue.toFixed(maximumFractionDigits)}%`;
	}
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed number value
 */
export const parseCurrency = (currencyString) => {
	if (!currencyString || typeof currencyString !== "string") {
		return 0;
	}

	// Remove currency symbols, commas, and spaces
	const cleanString = currencyString.replace(/[$,\s]/g, "");
	const parsed = parseFloat(cleanString);

	return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format a number with thousands separators
 * @param {number} number - The number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, options = {}) => {
	if (number === null || number === undefined || isNaN(number)) {
		return "0";
	}

	const { minimumFractionDigits = 0, maximumFractionDigits = 2, locale = "en-US" } = options;

	try {
		return new Intl.NumberFormat(locale, {
			minimumFractionDigits,
			maximumFractionDigits,
		}).format(number);
	} catch {
		// Fallback
		return number.toFixed(maximumFractionDigits);
	}
};

export default formatCurrency;
