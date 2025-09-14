import React from "react";
import { MdRefresh } from "react-icons/md";
import classes from "./RefreshButton.module.css";

const RefreshButton = ({ onRefresh, loading = false, size = "medium" }) => {
	return (
		<button
			className={`${classes.refreshButton} ${classes[size]}`}
			onClick={onRefresh}
			disabled={loading}
			aria-label={loading ? "Refreshing..." : "Refresh data"}
		>
			<MdRefresh 
				className={`${classes.refreshIcon} ${loading ? classes.spinning : ''}`} 
			/>
		</button>
	);
};

export default RefreshButton;
