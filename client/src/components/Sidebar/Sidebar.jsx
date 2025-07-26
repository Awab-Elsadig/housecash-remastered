import React from "react";
import { IoClose } from "react-icons/io5";
import classes from "./Sidebar.module.css";
import { navItems } from "./navigationConfig";
import NavigationItem from "./NavigationItem";
import AddItemButton from "../AddItemButton/AddItemButton";

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
	const handleMobileMenuClose = () => {
		if (setIsMobileMenuOpen) {
			setIsMobileMenuOpen(false);
		}
	};

	const handleNavClick = () => {
		// Close mobile menu after navigation
		handleMobileMenuClose();
	};

	return (
		<div className={`${classes.sidebar} ${isMobileMenuOpen ? classes.mobileOpen : ""}`}>
			{/* Mobile Close Button */}
			<button className={classes.mobileCloseButton} onClick={handleMobileMenuClose} aria-label="Close mobile menu">
				<IoClose />
			</button>

			{/* Logo Section */}
			<div className={classes.logoSection}>
				<img className={classes.nameLogo} src="/Logo Full - White.png" alt="Housecash Logo" />
			</div>

			{/* Navigation Links */}
			<nav className={classes.navLinks}>
				{navItems.map((item) => (
					<NavigationItem key={item.id} item={item} onClick={handleNavClick} />
				))}
			</nav>

			{/* Add Item Button - Hidden on mobile */}
			<div className={classes.addItemButtonContainer}>
				<AddItemButton />
			</div>
		</div>
	);
};

export default Sidebar;
