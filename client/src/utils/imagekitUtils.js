/**
 * ImageKit utility functions for optimized image handling
 */

/**
 * Check if a URL is a valid ImageKit URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is a valid ImageKit URL
 */
export const isValidImageKitUrl = (url) => {
	if (!url || typeof url !== "string") return false;

	try {
		const urlObj = new URL(url);
		return urlObj.hostname.includes("imagekit.io");
	} catch {
		return false;
	}
};

/**
 * Get optimized ImageKit URL with transformations for better performance
 * @param {string} url - The original ImageKit URL
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized ImageKit URL
 */
export const getOptimizedImageUrl = (url, options = {}) => {
	if (!isValidImageKitUrl(url)) return url;

	const { width = null, height = null, quality = 80, format = "auto", progressive = true } = options;

	try {
		const urlObj = new URL(url);
		const transformations = [];

		if (width) transformations.push(`w-${width}`);
		if (height) transformations.push(`h-${height}`);
		if (quality) transformations.push(`q-${quality}`);
		if (format) transformations.push(`f-${format}`);
		if (progressive) transformations.push("pr-true");

		if (transformations.length > 0) {
			// Check if URL already has transformations
			const pathParts = urlObj.pathname.split("/");
			const hasTransformations = pathParts.some((part) => part.startsWith("tr:"));

			if (!hasTransformations) {
				// Add transformations to the URL
				const transformationString = `tr:${transformations.join(",")}`;
				pathParts.splice(-1, 0, transformationString);
				urlObj.pathname = pathParts.join("/");
			}
		}

		return urlObj.toString();
	} catch (error) {
		console.warn("Error optimizing ImageKit URL:", error);
		return url;
	}
};

/**
 * Get profile picture URL with appropriate size optimizations
 * @param {string} url - The original profile picture URL
 * @param {string} size - Size preset: 'small', 'medium', 'large'
 * @returns {string} - Optimized profile picture URL
 */
export const getProfilePictureUrl = (url, size = "medium") => {
	if (!url) return url;

	const sizePresets = {
		small: { width: 50, height: 50 },
		medium: { width: 100, height: 100 },
		large: { width: 200, height: 200 },
	};

	const preset = sizePresets[size] || sizePresets.medium;

	return getOptimizedImageUrl(url, {
		...preset,
		quality: 85,
		format: "auto",
	});
};

/**
 * Preload an image to improve user experience
 * @param {string} url - The image URL to preload
 * @returns {Promise} - Promise that resolves when image is loaded
 */
export const preloadImage = (url) => {
	return new Promise((resolve, reject) => {
		if (!url) {
			reject(new Error("No URL provided"));
			return;
		}

		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
		img.src = url;
	});
};
