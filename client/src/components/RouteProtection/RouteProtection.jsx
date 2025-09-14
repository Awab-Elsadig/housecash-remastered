import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const RouteProtection = ({ children, requireAuth = true }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isChecking, setIsChecking] = useState(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	
	// Debug info for iPhone troubleshooting
	const [debugInfo, setDebugInfo] = useState({
		lastCheck: null,
		checkResult: null,
		errorDetails: null,
		userAgent: navigator.userAgent
	});

	useEffect(() => {
		const checkAuth = async () => {
			try {
				console.log("RouteProtection: Checking authentication for", location.pathname);
				
				// Add delay to allow cookies to be set after login
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Update debug info
				setDebugInfo(prev => ({
					...prev,
					lastCheck: new Date().toISOString(),
					checkResult: "Checking...",
					errorDetails: null
				}));
				
				// Add mobile-specific headers for iOS Safari
				const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
				const requestConfig = {
					withCredentials: true,
					timeout: 10000,
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					}
				};
				
				// Add mobile-specific headers
				if (isMobile) {
					requestConfig.headers['Cache-Control'] = 'no-cache';
					requestConfig.headers['Pragma'] = 'no-cache';
				}
				
				const response = await axios.get("/api/users/me", requestConfig);
				
				if (response.status === 200 && response.data) {
					console.log("RouteProtection: User is authenticated");
					setIsAuthenticated(true);
					setIsLoggingOut(false);
					
					// Update debug info
					setDebugInfo(prev => ({
						...prev,
						checkResult: "✅ AUTHENTICATED",
						errorDetails: `User ID: ${response.data._id}, Email: ${response.data.email}`
					}));
					
					// DISABLED REDIRECT - Just log for debugging
					if (location.pathname === "/" || location.pathname === "/login") {
						console.log("RouteProtection: User is authenticated on login page - would redirect to dashboard (disabled for debugging)");
						// navigate("/dashboard", { replace: true });
						// return;
					}
				} else {
					console.log("RouteProtection: User is not authenticated");
					setIsAuthenticated(false);
					
					// Update debug info
					setDebugInfo(prev => ({
						...prev,
						checkResult: "❌ NOT AUTHENTICATED",
						errorDetails: `Status: ${response.status}`
					}));
				}
			} catch (error) {
				console.log("RouteProtection: Authentication check failed:", error.response?.status);
				console.log("RouteProtection: Error details:", {
					message: error.message,
					code: error.code,
					response: error.response?.status
				});
				setIsAuthenticated(false);
				
				// Update debug info
				setDebugInfo(prev => ({
					...prev,
					checkResult: "❌ AUTH CHECK FAILED",
					errorDetails: `Error: ${error.message}, Code: ${error.code}, Status: ${error.response?.status}`
				}));
				
				// DISABLED REDIRECT - Just log for debugging
				if (requireAuth && (error.response?.status === 401 || error.response?.status === 403)) {
					console.log("RouteProtection: User is unauthenticated - would redirect to login (disabled for debugging)");
					// navigate("/", { replace: true });
					// return;
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
				flexDirection: 'column',
				justifyContent: 'center', 
				alignItems: 'center', 
				height: '100vh',
				fontSize: '18px',
				padding: '20px'
			}}>
				<div style={{ marginBottom: '20px' }}>
					{isLoggingOut ? 'Logging out...' : 'Checking authentication...'}
				</div>
				
				{/* Debug info for iPhone troubleshooting */}
				<div style={{
					backgroundColor: '#1a1a1a',
					border: '3px solid #ff6600',
					borderRadius: '12px',
					padding: '20px',
					fontSize: '16px',
					fontFamily: 'Courier New, monospace',
					maxWidth: '600px',
					width: '100%',
					color: '#ff6600',
					boxShadow: '0 4px 20px rgba(255, 102, 0, 0.3)'
				}}>
					<h4 style={{ 
						margin: '0 0 20px 0', 
						color: '#ff6600', 
						fontSize: '18px',
						textAlign: 'center',
						borderBottom: '2px solid #ff6600',
						paddingBottom: '10px'
					}}>
						🔍 ROUTE PROTECTION DEBUG
					</h4>
					
					<div style={{ 
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '15px',
						marginBottom: '15px'
					}}>
						<div style={{
							padding: '10px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #ff6600'
						}}>
							<strong style={{ color: '#ffff00' }}>PATH:</strong> 
							<span style={{ color: '#ff6600' }}>{location.pathname}</span>
						</div>
						
						<div style={{
							padding: '10px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #ff6600'
						}}>
							<strong style={{ color: '#ffff00' }}>AUTH REQUIRED:</strong> 
							<span style={{ color: requireAuth ? '#ff0000' : '#00ff00' }}>
								{requireAuth ? 'YES' : 'NO'}
							</span>
						</div>
					</div>
					
					<div style={{ 
						marginBottom: '15px',
						padding: '10px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>CHECK RESULT:</strong> 
						<span style={{ 
							color: debugInfo.checkResult?.includes('✅') ? '#00ff00' : 
								   debugInfo.checkResult?.includes('❌') ? '#ff0000' : '#ff6600'
						}}>
							{debugInfo.checkResult || 'Not checked yet'}
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '15px',
						padding: '10px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>AUTHENTICATED:</strong> 
						<span style={{ color: isAuthenticated ? '#00ff00' : '#ff0000' }}>
							{isAuthenticated ? 'YES' : 'NO'}
						</span>
					</div>
					
					{debugInfo.errorDetails && (
						<div style={{ 
							marginBottom: '15px',
							padding: '10px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #ff0000'
						}}>
							<strong style={{ color: '#ff0000' }}>ERROR DETAILS:</strong> 
							<div style={{ 
								backgroundColor: '#000', 
								padding: '10px', 
								borderRadius: '4px', 
								marginTop: '8px',
								wordBreak: 'break-all',
								fontSize: '14px',
								color: '#ff6666',
								border: '1px solid #ff0000',
								maxHeight: '200px',
								overflow: 'auto'
							}}>
								{debugInfo.errorDetails}
							</div>
						</div>
					)}
					
					<div style={{ 
						marginBottom: '15px',
						padding: '10px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>LAST CHECK:</strong> 
						<span style={{ color: '#ff6600', fontSize: '14px' }}>
							{debugInfo.lastCheck ? new Date(debugInfo.lastCheck).toLocaleString() : 'Never'}
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '15px',
						padding: '10px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>USER AGENT:</strong> 
						<div style={{ 
							backgroundColor: '#000', 
							padding: '10px', 
							borderRadius: '4px', 
							marginTop: '8px',
							fontSize: '12px',
							color: '#ff6600',
							border: '1px solid #ff6600',
							wordBreak: 'break-all',
							maxHeight: '100px',
							overflow: 'auto'
						}}>
							{debugInfo.userAgent}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// DISABLED REDIRECTS FOR DEBUGGING - Always render children
	// This prevents any redirects so we can see debug information
	
	// Show debug info if authentication failed but still render children
	if (requireAuth && !isAuthenticated) {
		console.log("RouteProtection: Authentication failed but rendering children for debugging");
		// Update debug info to show auth failure
		setDebugInfo(prev => ({
			...prev,
			checkResult: "❌ AUTH FAILED - But staying on page for debugging",
			errorDetails: "Authentication check failed but redirect disabled for debugging"
		}));
	}

	// Always render children - no redirects
	return children;
};

export default RouteProtection;
