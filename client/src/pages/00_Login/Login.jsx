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
		console.log("=== LOGIN DEBUG START ===");
		console.log("Form validation result:", validateForm());
		console.log("Form values:", values);
		console.log("API Base URL:", axios.defaults.baseURL);
		console.log("Environment VITE_API_URL:", import.meta.env.VITE_API_URL);
		
		if (validateForm()) {
			setLoading(true);
			try {
				console.log("Sending login request to:", `${axios.defaults.baseURL}/api/auth/login`);
				console.log("Request payload:", values);
				console.log("Request headers:", { withCredentials: true });
				
				const response = await axios.post("/api/auth/login", values, { withCredentials: true });

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

					console.log("Navigating to dashboard...");
					// Then navigate to dashboard
					navigate("/dashboard");
				} else {
					console.log("Unexpected response status:", response.status);
					setErrors((prev) => ({ ...prev, connectionError: true }));
				}
			} catch (error) {
				console.log("=== LOGIN ERROR DETAILS ===");
				console.log("Error object:", error);
				console.log("Error message:", error.message);
				console.log("Error response:", error.response);
				console.log("Error response data:", error.response?.data);
				console.log("Error response status:", error.response?.status);
				console.log("Error response statusText:", error.response?.statusText);
				console.log("Error response headers:", error.response?.headers);
				console.log("Network error:", error.code);
				console.log("Request config:", error.config);
				
				setErrors((prev) => ({ ...prev, connectionError: true }));
				setTheError(error.response?.data?.error || error.message || "Login failed");
				console.error("Login Error: ", error.response?.data);
			} finally {
				setLoading(false);
				console.log("=== LOGIN DEBUG END ===");
			}
		} else {
			console.log("Form validation failed:", errors);
		}
	};

	useEffect(() => {
		document.title = "Login - HouseCash";

		// Enable pull-to-refresh on mobile by allowing body overflow
		document.body.style.overflowY = "auto";
		document.body.style.touchAction = "pan-y";

		// Check if user is already logged in
		const checkExistingAuth = async () => {
			try {
				console.log("Checking if user is already authenticated...");
				const response = await axios.get("/api/users/me", { withCredentials: true });
				
				if (response.status === 200 && response.data) {
					console.log("User is already logged in, redirecting to dashboard");
					// User is already logged in, redirect to dashboard
					navigate("/dashboard");
					return;
				}
			} catch (error) {
				console.log("User is not authenticated or session expired:", error.response?.status);
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
