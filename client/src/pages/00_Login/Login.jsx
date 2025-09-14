import React, { useEffect, useState } from "react";
import classes from "./Login.module.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../../axiosConfig";
import { Helmet } from "react-helmet";
import { useUser } from "../../hooks/useUser";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";

const Login = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [values, setValues] = useState({
		houseCode: "",
		email: "",
		password: "",
	});
	const [errors, setErrors] = useState({});
	const [theError, setTheError] = useState("Unknown Error");

	const { updateUser, updateHouseMembers } = useUser();
	const [showPassword, setShowPassword] = useState(false);
	
	// Debug states for iPhone troubleshooting
	const [debugInfo, setDebugInfo] = useState({
		showDebug: false,
		authStatus: "Not checked",
		lastAttempt: null,
		errorDetails: null,
		userAgent: navigator.userAgent,
		cookies: document.cookie,
		attemptCount: 0
	});

	// Handle Input Change
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setValues((prevValues) => ({ ...prevValues, [name]: value }));
	};

	// Form Validation
	const validateForm = () => {
		const currentErrors = {};
		if (values.houseCode.length !== 6) {
			currentErrors.houseCode = "House Code must be exactly 6 characters.";
		}
		if (!values.email) {
			currentErrors.email = "Email is required.";
		}
		if (!values.password) {
			currentErrors.password = "Password is required.";
		}
		setErrors(currentErrors);
		return Object.keys(currentErrors).length === 0;
	};

	// Handle Submit with iOS Safari retry logic
	const handleSubmit = async (e) => {
		e.preventDefault();
		console.log("=== LOGIN DEBUG START ===");
		console.log("Form validation result:", validateForm());
		console.log("Form values:", values);
		console.log("API Base URL:", axios.defaults.baseURL);
		console.log("Environment VITE_API_URL:", import.meta.env.VITE_API_URL);
		
		// Update debug info
		setDebugInfo(prev => ({
			...prev,
			showDebug: true,
			authStatus: "Attempting login...",
			lastAttempt: new Date().toISOString(),
			attemptCount: prev.attemptCount + 1,
			cookies: document.cookie
		}));
		
		if (validateForm()) {
			setLoading(true);
			
			// Retry logic for iOS Safari
			const attemptLogin = async (retryCount = 0) => {
				try {
					console.log(`Login attempt ${retryCount + 1}`);
					console.log("Sending login request to:", `${axios.defaults.baseURL}/api/auth/login`);
					console.log("Request payload:", values);
					console.log("Request headers:", { withCredentials: true });
					
					// Update debug status
					setDebugInfo(prev => ({
						...prev,
						authStatus: `Login attempt ${retryCount + 1} in progress...`,
						errorDetails: null
					}));
					
					const response = await axios.post("/api/auth/login", values, { 
						withCredentials: true,
						timeout: 10000, // 10 second timeout
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json'
						}
					});

					console.log("Response received:", {
						status: response.status,
						statusText: response.statusText,
						data: response.data,
						headers: response.headers
					});

					if (response.status === 200) {
						console.log("Login successful, updating user data...");
						console.log("Response data structure:", {
							hasUser: !!response.data.user,
							hasHouseMembers: !!response.data.houseMembers,
							houseMembersType: typeof response.data.houseMembers,
							houseMembersValue: response.data.houseMembers,
							hasMembers: !!response.data.houseMembers?.members,
							membersType: typeof response.data.houseMembers?.members,
							membersValue: response.data.houseMembers?.members
						});
						
						// Update debug status
						setDebugInfo(prev => ({
							...prev,
							authStatus: "Login successful! Updating user data...",
							errorDetails: null
						}));
						
						// Update user data first
						if (response.data.user) {
							updateUser(response.data.user);
							console.log("User data updated successfully");
						} else {
							console.error("No user data in response");
						}
						
						// Update house members with proper null checking
						if (response.data.houseMembers) {
							// The server returns the house object with members array
							const members = response.data.houseMembers.members || [];
							updateHouseMembers(members);
							console.log("House members updated successfully:", members.length, "members");
						} else {
							console.error("No house members data in response:", response.data.houseMembers);
							// Set empty array as fallback
							updateHouseMembers([]);
						}

						// Update debug status before navigation
						setDebugInfo(prev => ({
							...prev,
							authStatus: "✅ LOGIN SUCCESSFUL! Navigating to dashboard...",
							errorDetails: `User: ${response.data.user?.email}, House Members: ${response.data.houseMembers?.members?.length || 0}`
						}));

						console.log("Login successful - navigating to dashboard");
						// Navigate to dashboard
						navigate("/dashboard");
						return true; // Success
					} else {
						console.log("Unexpected response status:", response.status);
						setErrors((prev) => ({ ...prev, connectionError: true }));
						
						// Update debug status
						setDebugInfo(prev => ({
							...prev,
							authStatus: `Login failed - Unexpected status: ${response.status}`,
							errorDetails: `Status: ${response.status}, StatusText: ${response.statusText}`
						}));
						
						return false;
					}
				} catch (error) {
					console.log(`=== LOGIN ERROR DETAILS (Attempt ${retryCount + 1}) ===`);
					console.log("Error object:", error);
					console.log("Error message:", error.message);
					console.log("Error response:", error.response);
					console.log("Error response data:", error.response?.data);
					console.log("Error response status:", error.response?.status);
					console.log("Error response statusText:", error.response?.statusText);
					console.log("Error response headers:", error.response?.headers);
					console.log("Network error:", error.code);
					console.log("Request config:", error.config);
					
					// Check if this is a network error that might be iOS Safari related
					const isNetworkError = error.code === 'NETWORK_ERROR' || 
										  error.message === 'Network Error' || 
										  error.code === 'ECONNABORTED' ||
										  !error.response;
					
					// Update debug status
					setDebugInfo(prev => ({
						...prev,
						authStatus: `Login attempt ${retryCount + 1} failed`,
						errorDetails: `Error: ${error.message}, Code: ${error.code}, Status: ${error.response?.status}, Response: ${JSON.stringify(error.response?.data)}`
					}));
					
					// Retry logic for iOS Safari network issues
					if (isNetworkError && retryCount < 2) {
						console.log(`Network error detected, retrying in ${(retryCount + 1) * 1000}ms...`);
						setDebugInfo(prev => ({
							...prev,
							authStatus: `Network error detected, retrying in ${(retryCount + 1) * 1000}ms...`
						}));
						await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
						return attemptLogin(retryCount + 1);
					}
					
					setErrors((prev) => ({ ...prev, connectionError: true }));
					setTheError(error.response?.data?.error || error.message || "Login failed");
					console.error("Login Error: ", error.response?.data);
					return false;
				}
			};
			
			try {
				await attemptLogin();
			} finally {
				setLoading(false);
				console.log("=== LOGIN DEBUG END ===");
			}
		} else {
			console.log("Form validation failed:", errors);
			setDebugInfo(prev => ({
				...prev,
				authStatus: "Form validation failed",
				errorDetails: JSON.stringify(errors)
			}));
		}
	};

	// Function to check current authentication status
	const checkAuthStatus = async () => {
		try {
			setDebugInfo(prev => ({
				...prev,
				authStatus: "Checking authentication status...",
				errorDetails: null
			}));
			
			const response = await axios.get("/api/users/me", { 
				withCredentials: true,
				timeout: 10000,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			});
			
			if (response.status === 200 && response.data) {
				setDebugInfo(prev => ({
					...prev,
					authStatus: "✅ AUTHENTICATED - User is logged in",
					errorDetails: `User ID: ${response.data._id}, Email: ${response.data.email}`
				}));
			} else {
				setDebugInfo(prev => ({
					...prev,
					authStatus: "❌ NOT AUTHENTICATED - No valid session",
					errorDetails: `Status: ${response.status}`
				}));
			}
		} catch (error) {
			setDebugInfo(prev => ({
				...prev,
				authStatus: "❌ AUTHENTICATION CHECK FAILED",
				errorDetails: `Error: ${error.message}, Code: ${error.code}, Status: ${error.response?.status}`
			}));
		}
	};

	useEffect(() => {
		document.title = "Login - HouseCash";

		// Enable pull-to-refresh on mobile by allowing body overflow
		document.body.style.overflowY = "auto";
		document.body.style.touchAction = "pan-y";

		// Clear all session data including impersonation
		sessionStorage.removeItem("originalAdmin");
		sessionStorage.removeItem("user");
		sessionStorage.removeItem("items");
		sessionStorage.removeItem("houseMembers");
		sessionStorage.removeItem("impersonationData");

		// Cleanup function to restore original body styles when component unmounts
		return () => {
			document.body.style.overflowY = "hidden";
			document.body.style.touchAction = "auto";
		};
	}, []);

	return (
		<div className={classes.login}>
			<Helmet>
				<title>Housecash | Login</title>
			</Helmet>
			<h1>HOUSECASH</h1>
			<div className={`${classes.formLayout}`}>
				<h2>Login</h2>
				<form onSubmit={handleSubmit}>
					<div className={classes.inputGroup}>
						<label htmlFor="houseCode">House Code</label>
						<input
							name="houseCode"
							label="House Code"
							value={values.houseCode}
							required={true}
							type="text"
							placeholder="Enter the house code"
							className={classes.houseCode}
							onChange={handleInputChange}
						/>
						{errors.houseCode && <span className={classes.errorMessage}>{errors.houseCode}</span>}
					</div>
					<div className={classes.inputGroup}>
						<label htmlFor="email">Email</label>
						<input
							name="email"
							label="email"
							value={values.email}
							required={true}
							type="email"
							placeholder="Eg. awab123@gmail.com"
							className={classes.email}
							onChange={handleInputChange}
						/>
						{errors.email && <span className={classes.errorMessage}>{errors.email}</span>}
					</div>
					<div className={classes.inputGroup}>
						<label htmlFor="password">Password</label>
						<div className={classes.passwordWrapper}>
							<input
								name="password"
								label="Password"
								value={values.password}
								required={true}
								type={showPassword ? "text" : "password"}
								placeholder="Enter your password"
								className={classes.password}
								onChange={handleInputChange}
							/>
							<span className={classes.eyeIcon} onClick={() => setShowPassword((prev) => !prev)}>
								{showPassword ? <IoMdEyeOff /> : <IoMdEye />}
							</span>
						</div>
						{errors.password && <span className={classes.errorMessage}>{errors.password}</span>}
					</div>
					<div className={classes.links}>
						<Link to="/change-password">Forgot Password?</Link>
						<Link to="/signup">New User ?</Link>
					</div>
					{errors.connectionError && <h3 className={classes.connectionError}>{theError}</h3>}
					<div className={classes.navigation}>
						<button onClick={handleSubmit} disabled={loading}>
							{loading ? "Logging in..." : "Login"}
						</button>
					</div>
					
					{/* Debug Panel - Temporary for iPhone troubleshooting */}
					<div style={{
						marginTop: '30px',
						padding: '20px',
						backgroundColor: '#1a1a1a',
						border: '3px solid #00ff00',
						borderRadius: '12px',
						fontSize: '16px',
						fontFamily: 'Courier New, monospace',
						color: '#00ff00',
						boxShadow: '0 4px 20px rgba(0, 255, 0, 0.3)',
						maxWidth: '100%',
						overflow: 'auto'
					}}>
						<h4 style={{ 
							margin: '0 0 20px 0', 
							color: '#00ff00', 
							fontSize: '18px',
							textAlign: 'center',
							borderBottom: '2px solid #00ff00',
							paddingBottom: '10px'
						}}>
							🔍 DEBUG PANEL - iPhone Troubleshooting
						</h4>
						
						<div style={{ 
							marginBottom: '15px',
							padding: '10px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #00ff00'
						}}>
							<strong style={{ color: '#ffff00' }}>STATUS:</strong> 
							<span style={{ color: debugInfo.authStatus.includes('✅') ? '#00ff00' : debugInfo.authStatus.includes('❌') ? '#ff0000' : '#ffff00' }}>
								{debugInfo.authStatus}
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
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '15px',
							marginBottom: '15px'
						}}>
							<div style={{
								padding: '10px',
								backgroundColor: '#000',
								borderRadius: '6px',
								border: '1px solid #00ff00'
							}}>
								<strong style={{ color: '#ffff00' }}>ATTEMPTS:</strong> 
								<span style={{ color: '#00ff00' }}>{debugInfo.attemptCount}</span>
							</div>
							
							<div style={{
								padding: '10px',
								backgroundColor: '#000',
								borderRadius: '6px',
								border: '1px solid #00ff00'
							}}>
								<strong style={{ color: '#ffff00' }}>LAST TRY:</strong> 
								<span style={{ color: '#00ff00', fontSize: '12px' }}>
									{debugInfo.lastAttempt ? new Date(debugInfo.lastAttempt).toLocaleTimeString() : 'None'}
								</span>
							</div>
						</div>
						
						<div style={{ 
							marginBottom: '15px',
							padding: '10px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #00ff00'
						}}>
							<strong style={{ color: '#ffff00' }}>USER AGENT:</strong> 
							<div style={{ 
								backgroundColor: '#000', 
								padding: '10px', 
								borderRadius: '4px', 
								marginTop: '8px',
								fontSize: '12px',
								color: '#00ff00',
								border: '1px solid #00ff00',
								wordBreak: 'break-all',
								maxHeight: '100px',
								overflow: 'auto'
							}}>
								{debugInfo.userAgent}
							</div>
						</div>
						
						<div style={{ 
							marginBottom: '20px',
							padding: '10px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #00ff00'
						}}>
							<strong style={{ color: '#ffff00' }}>COOKIES:</strong> 
							<div style={{ 
								backgroundColor: '#000', 
								padding: '10px', 
								borderRadius: '4px', 
								marginTop: '8px',
								fontSize: '12px',
								color: debugInfo.cookies ? '#00ff00' : '#ff6666',
								border: '1px solid #00ff00',
								wordBreak: 'break-all',
								maxHeight: '100px',
								overflow: 'auto'
							}}>
								{debugInfo.cookies || 'No cookies found'}
							</div>
						</div>
						
						<div style={{ 
							display: 'flex',
							gap: '10px',
							flexWrap: 'wrap',
							justifyContent: 'center'
						}}>
							<button 
								onClick={checkAuthStatus}
								style={{
									padding: '12px 20px',
									backgroundColor: '#007bff',
									color: 'white',
									border: '2px solid #007bff',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: 'bold',
									transition: 'all 0.3s ease'
								}}
								onMouseOver={(e) => {
									e.target.style.backgroundColor = '#0056b3';
									e.target.style.borderColor = '#0056b3';
								}}
								onMouseOut={(e) => {
									e.target.style.backgroundColor = '#007bff';
									e.target.style.borderColor = '#007bff';
								}}
							>
								🔍 Check Auth Status
							</button>
							
							<button 
								onClick={() => setDebugInfo(prev => ({ ...prev, showDebug: false }))}
								style={{
									padding: '12px 20px',
									backgroundColor: '#6c757d',
									color: 'white',
									border: '2px solid #6c757d',
									borderRadius: '6px',
									cursor: 'pointer',
									fontSize: '14px',
									fontWeight: 'bold',
									transition: 'all 0.3s ease'
								}}
								onMouseOver={(e) => {
									e.target.style.backgroundColor = '#545b62';
									e.target.style.borderColor = '#545b62';
								}}
								onMouseOut={(e) => {
									e.target.style.backgroundColor = '#6c757d';
									e.target.style.borderColor = '#6c757d';
								}}
							>
								👁️ Hide Debug
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

export default Login;
