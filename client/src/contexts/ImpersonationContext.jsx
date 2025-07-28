import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

const ImpersonationContext = createContext();

export const ImpersonationProvider = ({ children }) => {
	const [isImpersonating, setIsImpersonating] = useState(false);
	const [impersonationData, setImpersonationData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkImpersonationStatus = async () => {
			try {
				// Don't check impersonation on login page
				if (window.location.pathname === "/" || window.location.pathname === "/login") {
					setLoading(false);
					return;
				}

				// Check if there's impersonation data in sessionStorage
				const storedData = sessionStorage.getItem("impersonationData");

				if (storedData) {
					const data = JSON.parse(storedData);

					// Check if the data is not too old (e.g., 24 hours)
					const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
					if (Date.now() - data.timestamp < maxAge) {
						setIsImpersonating(true);
						setImpersonationData(data);

						// Verify with the server that impersonation is still active
						try {
							await axios.get("/api/admin/impersonation-status", {
								withCredentials: true,
							});
						} catch {
							// If server says no impersonation, clear local data
							console.log("Server impersonation status check failed, clearing local data");
							sessionStorage.removeItem("impersonationData");
							setIsImpersonating(false);
							setImpersonationData(null);
						}
					} else {
						// Data is too old, clear it
						sessionStorage.removeItem("impersonationData");
					}
				}
			} catch (error) {
				console.error("Error checking impersonation status:", error);
				// Clear potentially corrupted data
				sessionStorage.removeItem("impersonationData");
			} finally {
				setLoading(false);
			}
		};

		// Handle impersonation data from parent window
		const handleMessage = (event) => {
			if (event.origin !== window.location.origin) return;

			if (event.data.type === "IMPERSONATION_DATA") {
				const impersonationData = event.data.data;
				sessionStorage.setItem("impersonationData", JSON.stringify(impersonationData));
				setIsImpersonating(true);
				setImpersonationData(impersonationData);
				setLoading(false);

				// Clear old user data to force refresh from server
				sessionStorage.removeItem("user");
				sessionStorage.removeItem("houseMembers");
				sessionStorage.removeItem("items");

				// Simply reload without adding URL parameters to prevent infinite loop
				window.location.reload();
			}
		};

		// No need for window.opener since we're staying in same window now
		window.addEventListener("message", handleMessage);
		checkImpersonationStatus();

		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	const stopImpersonation = async () => {
		try {
			await axios.post(
				"/api/admin/stop-impersonation",
				{},
				{
					withCredentials: true,
				}
			);

			// Clear local impersonation data
			sessionStorage.removeItem("impersonationData");
			setIsImpersonating(false);
			setImpersonationData(null);

			return true;
		} catch (error) {
			console.error("Error stopping impersonation:", error);
			throw error;
		}
	};

	const value = {
		isImpersonating,
		impersonationData,
		loading,
		stopImpersonation,
		setIsImpersonating,
		setImpersonationData,
	};

	return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
};

export { ImpersonationContext };
export default ImpersonationProvider;
