import React from "react";
import { NavLink } from "react-router-dom";
import classes from "./Sidebar.module.css";

const NavigationItem = ({ item, onClick }) => {
	const IconComponent = item.icon;

	return (
		<NavLink
			to={item.path}
			className={({ isActive }) => `${classes.navLink} ${isActive ? classes.active : ""}`}
			onClick={onClick}
		>
			<IconComponent className={classes.icon} />
			{item.label}
		</NavLink>
	);
};

export default NavigationItem;
