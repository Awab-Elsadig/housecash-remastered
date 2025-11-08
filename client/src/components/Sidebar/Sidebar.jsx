import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import classes from "./Sidebar.module.css";
import { navItems } from "./navigationConfig";
import NavigationItem from "./NavigationItem";
import AddItemButton from "../AddItemButton/AddItemButton";
import { useUser } from "../../hooks/useUser";

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
	const { user } = useUser();
	const panelRef = useRef(null);
	const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);

	useEffect(() => {
		const mql = window.matchMedia("(max-width: 768px)");
		const handler = (e) => setIsMobile(e.matches);
		mql.addEventListener ? mql.addEventListener("change", handler) : mql.addListener(handler);
		return () => {
			mql.removeEventListener ? mql.removeEventListener("change", handler) : mql.removeListener(handler);
		};
	}, []);

	const handleMobileMenuClose = useCallback(() => {
		if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
	}, [setIsMobileMenuOpen]);

	const handleKeyDown = useCallback(
		(e) => {
			if (!isMobile) return;
			if (e.key === "Escape") handleMobileMenuClose();
		},
		[isMobile, handleMobileMenuClose]
	);

	useEffect(() => {
		if (!isMobile) return;
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isMobile, handleKeyDown]);

	const filteredNavItems = useMemo(() => {
		return navItems.filter((item) => {
			if (item.adminOnly) return user?.role === "admin";
			return true;
		});
	}, [user?.role]);

	const handleNavClick = useCallback(() => {
		// Close menu on mobile after navigation
		if (isMobile) handleMobileMenuClose();
	}, [isMobile, handleMobileMenuClose]);

	// Desktop: render static sidebar
	if (!isMobile) {
		return (
			<div ref={panelRef} className={`${classes.sidebar}`}>
				<button className={classes.mobileCloseButton} onClick={handleMobileMenuClose} aria-label="Close mobile menu">
					<IoClose />
				</button>
				<div className={classes.logoSection}>
					<img className={classes.nameLogo} src="/Logo Full - White.png" alt="Housecash Logo" />
				</div>
				<nav className={classes.navLinks} aria-label="Sidebar navigation">
					{filteredNavItems.map((item) => (
						<NavigationItem key={item.id} item={item} onClick={handleNavClick} />
					))}
				</nav>
				<div className={classes.addItemButtonContainer}>
					<AddItemButton />
				</div>
			</div>
		);
	}

	// Mobile: off-canvas with CSS transitions (always in DOM for instant response)
	return (
		<div
			ref={panelRef}
			className={`${classes.sidebar} ${isMobileMenuOpen ? classes.mobileOpen : ''}`}
			role="dialog"
			aria-modal="true"
			aria-label="Mobile menu"
			aria-hidden={!isMobileMenuOpen}
		>
			<button className={classes.mobileCloseButton} onClick={handleMobileMenuClose} aria-label="Close mobile menu">
				<IoClose />
			</button>
			<div className={classes.logoSection}>
				<img className={classes.nameLogo} src="/Logo Full - White.png" alt="Housecash Logo" />
			</div>
			<nav className={classes.navLinks} aria-label="Sidebar navigation">
				{filteredNavItems.map((item) => (
					<NavigationItem key={item.id} item={item} onClick={handleNavClick} />
				))}
			</nav>
			<div className={classes.addItemButtonContainer}>
				<AddItemButton />
			</div>
		</div>
	);
};

export default Sidebar;
