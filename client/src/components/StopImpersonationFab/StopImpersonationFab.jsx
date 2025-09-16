import React, { useState } from "react";
import { RiUserUnfollowLine } from "react-icons/ri";
import classes from "./StopImpersonationFab.module.css";
import { useImpersonationContext } from "../../hooks/useImpersonationContext";

const StopImpersonationFab = () => {
	const { stopImpersonation } = useImpersonationContext();
	const [loading, setLoading] = useState(false);

	const onClick = async () => {
		if (loading) return;
		setLoading(true);
		try {
			await stopImpersonation();
			// No need to reload - the impersonation context will handle the data refresh
		} catch (e) {
			console.error("Failed to stop impersonation", e);
		} finally {
			setLoading(false);
		}
	};

	return (
		<button className={classes.fab} onClick={onClick} aria-label="Stop impersonation" disabled={loading}>
			<RiUserUnfollowLine className={classes.icon} />
		</button>
	);
};

export default StopImpersonationFab;


