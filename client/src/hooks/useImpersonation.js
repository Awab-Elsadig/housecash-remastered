// Custom hook for impersonation functionality
import { useState, useCallback } from "react";
import axios from "axios";

export const useImpersonation = () => {
	const [impersonating, setImpersonating] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Start impersonating a user
	const startImpersonation = useCallback(async (targetUserId) => {
		setLoading(true);
		setError(null);

		try {
			const response = await axios.post("/api/admin/impersonate", { targetUserId }, { withCredentials: true });

			if (response.data?.user) {
				setImpersonating(response.data.user);
				return response.data;
			}
		} catch (error) {
			console.error("Error starting impersonation:", error);
			setError(error.response?.data?.error || "Failed to start impersonation");
			throw error;
		} finally {
			setLoading(false);
		}
	}, []);

	// Stop impersonating
	const stopImpersonation = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await axios.post(
				"/api/admin/stop-impersonation",
				{},
				{
					withCredentials: true,
				}
			);

			if (response.status === 200) {
				setImpersonating(null);
				return response.data;
			}
		} catch (error) {
			console.error("Error stopping impersonation:", error);
			setError(error.response?.data?.error || "Failed to stop impersonation");
			throw error;
		} finally {
			setLoading(false);
		}
	}, []);

	// Get all users (admin only)
	const getAllUsers = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await axios.get("/api/admin/users", {
				withCredentials: true,
			});

			if (response.data?.users) {
				return response.data.users;
			}
		} catch (error) {
			console.error("Error fetching users:", error);
			setError(error.response?.data?.error || "Failed to fetch users");
			throw error;
		} finally {
			setLoading(false);
		}
	}, []);

	// Clear error
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		impersonating,
		loading,
		error,
		startImpersonation,
		stopImpersonation,
		getAllUsers,
		clearError,
		setImpersonating,
	};
};
