import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HiMenuAlt3 } from "react-icons/hi";
import { RiUserUnfollowLine, RiUserFollowLine } from "react-icons/ri";
import classes from "./Header.module.css";
import { useUser } from "../../hooks/useUser";
import { useImpersonationContext } from "../../hooks/useImpersonationContext";
import NotificationDropdown from "../NotificationDropdown/NotificationDropdown";

const Header = ({ toggleMobileMenu }) => {
	const { user } = useUser();
	const location = useLocation();
	const navigate = useNavigate();
	const { isImpersonating, impersonationData, stopImpersonation } = useImpersonationContext();
	const [stoppingImpersonation, setStoppingImpersonation] = useState(false);

	const handleStopImpersonation = async () => {
		setStoppingImpersonation(true);
		try {
			await stopImpersonation();

			// Stay in the same window, just refresh the page to clear the banner
			window.location.reload();
		} catch (error) {
			console.error("Error stopping impersonation:", error);
			alert("Failed to stop impersonation. Please try again.");
		} finally {
			setStoppingImpersonation(false);
		}
	};

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
			case "/admin":
				return {
					title: "Admin Panel",
					subtitle: "Manage users and system administration",
				};
			default:
				return {
					title: "Housecash",
					subtitle: "House expense management system",
				};
		}
	};

	const pageInfo = getPageInfo();

	// Check if we're actually impersonating a different user
	// Show banner when we have impersonation data and we're not on login page
	const isActuallyImpersonating =
		isImpersonating &&
		impersonationData &&
		impersonationData.impersonatedUserId &&
		impersonationData.originalAdminId &&
		impersonationData.impersonatedUserId !== impersonationData.originalAdminId;

	return (
		<div className={classes.header}>
			{/* Impersonation Banner */}
			{isActuallyImpersonating && (
				<div className={classes.impersonationBanner}>
					<div className={classes.impersonationInfo}>
						<RiUserFollowLine className={classes.impersonationIcon} />
						<span>
							Impersonating: <strong>{user?.name || "Unknown User"}</strong>
							{impersonationData?.originalAdmin && (
								<span className={classes.adminInfo}> (Admin: {impersonationData.originalAdmin.name})</span>
							)}
						</span>
					</div>
					<button
						className={classes.stopImpersonationBtn}
						onClick={handleStopImpersonation}
						disabled={stoppingImpersonation}
					>
						<RiUserUnfollowLine />
						{stoppingImpersonation ? "Stopping..." : "Stop Impersonation"}
					</button>
				</div>
			)}

			{/* Main Header Content */}
			<div className={classes.headerContent}>
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
		</div>
	);
};

export default Header;
