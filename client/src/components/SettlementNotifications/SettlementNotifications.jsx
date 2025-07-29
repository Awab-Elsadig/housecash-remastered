import React from "react";
import { FaCheck, FaTimes, FaExchangeAlt } from "react-icons/fa";
import { useSettlement } from "../../contexts/SettlementContext";
import classes from "./SettlementNotifications.module.css";

const SettlementNotifications = ({ onSettlementAccepted }) => {
	const { settlementRequests, respondToSettlementRequest } = useSettlement();

	// Filter for incoming requests only
	const incomingRequests = Object.entries(settlementRequests).filter(([, request]) => request.type === "incoming");

	if (incomingRequests.length === 0) {
		return null;
	}

	const handleResponse = async (memberId, accepted) => {
		const result = await respondToSettlementRequest(memberId, accepted);

		if (result.success && accepted && onSettlementAccepted) {
			// Notify parent component that settlement was accepted
			onSettlementAccepted(result.senderId);
		}
	};

	return (
		<div className={classes.settlementNotifications}>
			{incomingRequests.map(([memberId, request]) => (
				<div key={memberId} className={classes.notificationCard}>
					<div className={classes.notificationHeader}>
						<FaExchangeAlt className={classes.settlementIcon} />
						<span className={classes.notificationTitle}>Settlement Request</span>
					</div>

					<div className={classes.notificationContent}>
						<p className={classes.requestText}>
							<strong>{request.senderName.split(" ")[0]}</strong> wants to settle{" "}
							<strong>${Math.abs(request.amount).toFixed(2)}</strong>
						</p>

						{request.expiresAt && (
							<div className={classes.timeLeft}>
								Expires in <strong>{Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000))}s</strong>
							</div>
						)}
					</div>

					<div className={classes.buttonGroup}>
						<button
							onClick={() => handleResponse(memberId, true)}
							className={`${classes.responseBtn} ${classes.acceptBtn}`}
						>
							<FaCheck /> Accept
						</button>
						<button
							onClick={() => handleResponse(memberId, false)}
							className={`${classes.responseBtn} ${classes.declineBtn}`}
						>
							<FaTimes /> Decline
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default SettlementNotifications;
