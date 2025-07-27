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
					updateUser(response.data.user);
					updateHouseMembers(response.data.houseMembers.members);

					// Then navigate to dashboard
					navigate("/dashboard");
				} else {
					setErrors((prev) => ({ ...prev, connectionError: true }));
				}
			} catch (error) {
				setErrors((prev) => ({ ...prev, connectionError: true }));
				setTheError(error.response?.data?.error || "Login failed");
				console.error("Login Error: ", error.response?.data);
			} finally {
				setLoading(false);
			}
		}
	};

	useEffect(() => {
		document.title = "Login - HouseCash";

		sessionStorage.removeItem("originalAdmin");
		sessionStorage.removeItem("user");
		sessionStorage.removeItem("items");
		sessionStorage.removeItem("houseMembers");
	}, []);

	return (
		<div className={classes.login}>
			<Helmet>
				<title>Housecash | Login</title>
				<link rel="icon" href="/Page_Icons/cart.svg" />
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
