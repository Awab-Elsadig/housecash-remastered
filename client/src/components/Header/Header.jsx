import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HiMenuAlt3 } from "react-icons/hi";
import classes from "./Header.module.css";
import { useUser } from "../../hooks/useUser";
import NotificationDropdown from "../NotificationDropdown/NotificationDropdown";

const Header = ({ toggleMobileMenu }) => {
	const { user } = useUser();
	const location = useLocation();
	const navigate = useNavigate();

	// Page information based on current route
	const getPageInfo = () => {
		switch (location.pathname) {
			case "/dashboard":
				return {
					title: "Dashboard",
					subtitle: "Overview of your expenses and house finances",
				};
			case "/expenses":
				return {
					title: "Expenses",
					subtitle: "Manage and track all household expenses",
				};
			case "/payment-history":
				return {
					title: "Payment History",
					subtitle: "Track all your payment transactions and statistics",
				};
			case "/settings":
				return {
					title: "Settings",
					subtitle: "Manage your account, house, and preferences",
				};
			default:
				return {
					title: "Housecash",
					subtitle: "House expense management system",
				};
		}
	};

	const pageInfo = getPageInfo();

	return (
		<div className={classes.header}>
			{/* Mobile Menu Button */}
			<button className={classes.mobileMenuButton} onClick={toggleMobileMenu}>
				<HiMenuAlt3 />
			</button>

			{/* Page Information */}
			<div className={classes.pageInfo}>
				<h1 className={classes.pageTitle}>{pageInfo.title}</h1>
				<p className={classes.pageSubtitle}>{pageInfo.subtitle}</p>
			</div>

			<div className={classes.profile}>
				<NotificationDropdown />
				<span className={classes.greeting}>
					<span>Hello</span>
					<span>{user?.name ? user.name.split(" ")[0] : "User"}</span>
				</span>
				<img
					src="https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
					alt="Profile"
					className={classes.profilePic}
					onClick={() => navigate("/settings")}
					style={{ cursor: "pointer" }}
				/>
			</div>
		</div>
	);
};

export default Header;
