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

	// Handle Submit
	const handleSubmit = async (e) => {
		e.preventDefault();
		
		if (validateForm()) {
			setLoading(true);
			try {
				const response = await axios.post("/api/auth/login", values, { withCredentials: true });

				if (response.status === 200) {
					// Update user data first
					if (response.data.user) {
						updateUser(response.data.user);
					}
					
					// Update house members with proper null checking
					if (response.data.houseMembers) {
						// The server returns the house object with members array
						const members = response.data.houseMembers.members || [];
						updateHouseMembers(members);
					} else {
						// Set empty array as fallback
						updateHouseMembers([]);
					}

					// Connect Ably for real-time updates after login
					const { connectAbly } = await import("../../ablyConfig");
					connectAbly();

					// Then navigate to dashboard
					navigate("/dashboard");
				} else {
					setErrors((prev) => ({ ...prev, connectionError: true }));
				}
			} catch (error) {
				// Comprehensive error logging
				console.error("=== LOGIN ERROR DETAILS ===");
				console.error("Error message:", error.message);
				console.error("Error code:", error.code);
				console.error("Error name:", error.name);
				console.error("Error stack:", error.stack);
				console.error("Full error object:", error);
				
				// Network-specific error details
				if (error.response) {
					console.error("Response status:", error.response.status);
					console.error("Response statusText:", error.response.statusText);
					console.error("Response headers:", error.response.headers);
					console.error("Response data:", error.response.data);
				} else if (error.request) {
					console.error("Request object:", error.request);
					console.error("No response received - possible network issue");
				} else {
					console.error("Error setting up request:", error.message);
				}
				
				// Axios-specific error details
				if (error.config) {
					console.error("Request config:", {
						url: error.config.url,
						method: error.config.method,
						baseURL: error.config.baseURL,
						timeout: error.config.timeout,
						withCredentials: error.config.withCredentials
					});
				}
				
				console.error("=== END LOGIN ERROR DETAILS ===");
				
				setErrors((prev) => ({ ...prev, connectionError: true }));
				setTheError(error.response?.data?.error || error.message || "Login failed");
			} finally {
				setLoading(false);
			}
		}
	};

	useEffect(() => {
		document.title = "Login - HouseCash";

		// Allow body overflow for scrolling
		document.body.style.overflowY = "auto";
		document.body.style.touchAction = "pan-y";

		// Check if user is already logged in
		const checkExistingAuth = async () => {
			try {
				const response = await axios.get("/api/users/me", { withCredentials: true });
				
				if (response.status === 200 && response.data) {
					// User is already logged in, redirect to dashboard
					navigate("/dashboard");
					return;
				}
			} catch (error) {
				// Only show a friendly warning if it's a 401 (expected when logged out)
				// or if there's a network issue (unexpected)
				if (error.response?.status === 401) {
					// Expected behavior - user is not logged in
					// Show a friendly warning instead of error
					console.warn("⚠️ You were logged out from your previous session. Please log in again.");
				} else if (error.request && !error.response) {
					// Network issue - this is unexpected
					console.warn("⚠️ Unable to verify authentication. Please check your connection.");
				}
				// User is not logged in, continue with login page
			}
		};

		checkExistingAuth();

		// Clear all session data including impersonation (but only if not authenticated)
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
	}, [navigate]);

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
				</form>
			</div>
		</div>
	);
};

export default Login;
