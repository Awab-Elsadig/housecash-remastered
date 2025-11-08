import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useImpersonationContext } from "../../hooks/useImpersonationContext";
import { connectAbly } from "../../ablyConfig";

const RouteProtection = ({ children, requireAuth = true }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isChecking, setIsChecking] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const { isImpersonating } = useImpersonationContext();

	useEffect(() => {
		const checkAuth = async () => {
			try {
				// First check sessionStorage for cached user data, but skip cache if impersonating
				const cachedUser = sessionStorage.getItem("user");
				if (cachedUser && requireAuth && !isImpersonating) {
					setIsAuthenticated(true);
					setIsLoggingOut(false);
					setIsChecking(false);
					return;
				}
				
				// Only make API call if no cached data or for login page
				const response = await axios.get("/api/users/me", { withCredentials: true });
				
				if (response.status === 200 && response.data) {
					setIsAuthenticated(true);
					setIsLoggingOut(false);
					
					// Connect Ably for real-time updates when authenticated
					connectAbly();
					
					// If user is on login page but already authenticated, redirect to dashboard
					if (location.pathname === "/" || location.pathname === "/login") {
						navigate("/dashboard", { replace: true });
						return;
					}
				} else {
					setIsAuthenticated(false);
				}
			} catch (error) {
				setIsAuthenticated(false);
				
				// Suppress 401 errors - they're expected during auth checks
				// Only redirect if route requires auth
				if (requireAuth && (error.response?.status === 401 || error.response?.status === 403)) {
					navigate("/", { replace: true });
					return;
				}
				// Silent - expected behavior during auth checks
			} finally {
				setIsChecking(false);
			}
		};

		checkAuth();

		// Listen for impersonation events to trigger re-authentication
		const handleImpersonationChange = () => {
			setIsChecking(true);
			checkAuth();
		};

		window.addEventListener('impersonationStarted', handleImpersonationChange);
		window.addEventListener('impersonationStopped', handleImpersonationChange);

		return () => {
			window.removeEventListener('impersonationStarted', handleImpersonationChange);
			window.removeEventListener('impersonationStopped', handleImpersonationChange);
		};
	// Run when impersonation status changes or on route change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [navigate, requireAuth, isImpersonating]);

	// Listen for logout events
	useEffect(() => {
		const handleLogout = () => {
			setIsLoggingOut(true);
			setIsAuthenticated(false);
		};

		// Listen for storage changes (logout clears sessionStorage)
		const handleStorageChange = (e) => {
			if (e.key === 'user' && e.newValue === null) {
				handleLogout();
			}
		};

		window.addEventListener('storage', handleStorageChange);
		
		// Also listen for custom logout event
		window.addEventListener('userLogout', handleLogout);

		return () => {
			window.removeEventListener('storage', handleStorageChange);
			window.removeEventListener('userLogout', handleLogout);
		};
	}, []);

	// Show loading while checking authentication or logging out
	if (isChecking || isLoggingOut) {
		// For public routes (login), show a blocking loader.
		if (!requireAuth) {
			return (
				<div style={{ 
					display: 'flex', 
					justifyContent: 'center', 
					alignItems: 'center', 
					height: '100vh',
					fontSize: '18px'
				}}>
					{isLoggingOut ? 'Logging out...' : 'Checking authentication...'}
				</div>
			);
		}
		// For protected routes, avoid blocking UI to prevent overlays capturing clicks
		return children;
	}

	// If route requires auth but user is not authenticated, don't render children
	if (requireAuth && !isAuthenticated) {
		return null; // Will redirect to login
	}

	// If route doesn't require auth (like login page) and user is authenticated, don't render children
	if (!requireAuth && isAuthenticated) {
		return null; // Will redirect to dashboard
	}

	// Render children if authentication check passes
	return children;
};

export default RouteProtection;
