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
 * Custom hook for initial page loading
 * @param {number} duration - Loading duration in milliseconds (default: 1200ms)
 * @returns {boolean} - The loading state
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
