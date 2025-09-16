import React from "react";
import { useImpersonationContext } from "../../hooks/useImpersonationContext";
import classes from "./ImpersonationBanner.module.css";

const ImpersonationBanner = () => {
	const { isImpersonating, impersonationData, stopImpersonation } = useImpersonationContext();
	const [isStopping, setIsStopping] = React.useState(false);

	const isActuallyImpersonating =
		isImpersonating &&
		impersonationData &&
		impersonationData.impersonatedUserId &&
		impersonationData.originalAdminId &&
		impersonationData.impersonatedUserId !== impersonationData.originalAdminId;

	if (!isActuallyImpersonating) return null;

	const handleStopImpersonation = async () => {
		setIsStopping(true);
		try {
			await stopImpersonation();
		} catch (error) {
			console.error("Error stopping impersonation:", error);
			alert("Failed to stop impersonation. Please try again.");
		} finally {
			setIsStopping(false);
		}
	};

	return (
		<div className={`${classes.banner} impersonationBanner`}>
			<div className={classes.content}>
				<div className={classes.info}>
					<span className={classes.icon}>👤</span>
					<span className={classes.text}>
						You are impersonating <strong>{impersonationData.impersonatedUserName}</strong>
					</span>
				</div>
				<button
					className={classes.stopButton}
					onClick={handleStopImpersonation}
					disabled={isStopping}
				>
					{isStopping ? "Stopping..." : "Stop Impersonation"}
				</button>
			</div>
		</div>
	);
};

export default ImpersonationBanner;
