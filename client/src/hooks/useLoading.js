import { useState, useEffect } from "react";

/**
 * Custom hook for managing loading states with minimum duration
 * @param {boolean} isLoading - The actual loading state
 * @param {number} minDuration - Minimum loading duration in milliseconds (default: 800ms)
 * @returns {boolean} - The managed loading state
 */
export const useLoading = (isLoading, minDuration = 800) => {
	const [isMinLoading, setIsMinLoading] = useState(true);

	useEffect(() => {
		if (isLoading) {
			setIsMinLoading(true);
		} else {
			const timer = setTimeout(() => {
				setIsMinLoading(false);
			}, minDuration);

			return () => clearTimeout(timer);
		}
	}, [isLoading, minDuration]);

	return isLoading || isMinLoading;
};

/**
 * Smart loading hook that shows skeleton until data is ready
 * @param {boolean} dataReady - Whether the required data is loaded and ready
 * @param {number} minDuration - Minimum loading duration in milliseconds (default: 400ms)
 * @returns {boolean} - The loading state
 */
export const useDataLoading = (dataReady, minDuration = 400) => {
	const [showLoading, setShowLoading] = useState(true);
	const [startTime] = useState(Date.now());

	useEffect(() => {
		if (dataReady) {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, minDuration - elapsed);

			// Add a small buffer to ensure smooth transition
			const timer = setTimeout(() => {
				setShowLoading(false);
			}, remaining + 100);

			return () => clearTimeout(timer);
		}
	}, [dataReady, minDuration, startTime]);

	return !dataReady || showLoading;
};
/**
 * Custom hook for initial page loading
 * @param {number} duration - Loading duration in milliseconds (default: 1200ms)
 * @returns {boolean} - The loading state
 * @deprecated Use useDataLoading instead for better UX
 */
export const useInitialLoading = (duration = 1200) => {
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, duration);

		return () => clearTimeout(timer);
	}, [duration]);

	return isLoading;
};
