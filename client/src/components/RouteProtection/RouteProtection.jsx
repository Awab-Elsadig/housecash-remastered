import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const RouteProtection = ({ children, requireAuth = true }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isChecking, setIsChecking] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		const checkAuth = async () => {
			try {
				console.log("RouteProtection: Checking authentication for", location.pathname);
				const response = await axios.get("/api/users/me", { withCredentials: true });
				
				if (response.status === 200 && response.data) {
					console.log("RouteProtection: User is authenticated");
					setIsAuthenticated(true);
					setIsLoggingOut(false);
					
					// If user is on login page but already authenticated, redirect to dashboard
					if (location.pathname === "/" || location.pathname === "/login") {
						console.log("RouteProtection: Redirecting authenticated user from login to dashboard");
						navigate("/dashboard", { replace: true });
						return;
					}
				} else {
					console.log("RouteProtection: User is not authenticated");
					setIsAuthenticated(false);
				}
			} catch (error) {
				console.log("RouteProtection: Authentication check failed:", error.response?.status);
				setIsAuthenticated(false);
				
				// If route requires auth but user is not authenticated, redirect to login
				if (requireAuth && (error.response?.status === 401 || error.response?.status === 403)) {
					console.log("RouteProtection: Redirecting unauthenticated user to login");
					navigate("/", { replace: true });
					return;
				}
			} finally {
				setIsChecking(false);
			}
		};

		checkAuth();
	}, [navigate, location.pathname, requireAuth]);

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
