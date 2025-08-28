import React, { useMemo, useEffect, useState } from "react";
import { useSettlement } from "../../contexts/useSettlement";
import { FaExchangeAlt, FaArrowUp, FaArrowDown, FaHourglassHalf } from "react-icons/fa";
import classes from "./NetBalance.module.css";
import { useUser } from "../../hooks/useUser";

const NetBalance = () => {
	const { user, items = [], houseMembers = [] } = useUser();
	const [, forceUpdate] = useState(0);
	const {
		settlementRequests = {},
		settleUp = () => {},
		acceptSettlement = () => {},
		declineSettlement = () => {},
		cancelSettlementRequest = () => {},
		getSettlementTimeRemaining = () => 0,
	} = useSettlement();

	// Force re-render every second when there are active settlement requests
	useEffect(() => {
		const hasActiveRequests = Object.keys(settlementRequests).length > 0;
		if (!hasActiveRequests) return;

		const interval = setInterval(() => {
			forceUpdate((prev) => prev + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [settlementRequests, forceUpdate]);

	const { owedToUser, userOwes } = useMemo(() => {
		if (!user?._id) return { owedToUser: {}, userOwes: {} };

		// rawDebts[debtor][creditor] = amount (positive means debtor owes creditor)
		const rawDebts = {};

		items.forEach((item) => {
			if (!item?.price || !item?.members?.length) return;
			const authorId = item.author?.toString();
			if (!authorId) return;

			// Assume every listed member shares the cost equally.
			const participants = item.members; // ignoring 'got' flag for balance math
			const share = item.price / participants.length;

			participants.forEach((m) => {
				const pid = m.userID?.toString();
				if (!pid || pid === authorId) return; // skip author
				if (m.paid) return; // already reimbursed
				if (!rawDebts[pid]) rawDebts[pid] = {};
				rawDebts[pid][authorId] = (rawDebts[pid][authorId] || 0) + share;
			});
		});

		// Net mutual debts pairwise -> keep only one direction with difference
		for (const a in rawDebts) {
			for (const b in rawDebts[a]) {
				const forward = rawDebts[a][b];
				const reverse = rawDebts[b]?.[a] || 0;
				if (reverse > 0) {
					if (forward === reverse) {
						delete rawDebts[a][b];
						delete rawDebts[b][a];
					} else if (forward > reverse) {
						rawDebts[a][b] = forward - reverse;
						delete rawDebts[b][a];
					} else {
						rawDebts[b][a] = reverse - forward;
						delete rawDebts[a][b];
					}
				}
			}
		}

		const currentUserId = user._id.toString();
		const owedToUser = {}; // others owe current user
		const userOwes = {}; // current user owes others

		for (const debtor in rawDebts) {
			for (const creditor in rawDebts[debtor]) {
				const amount = rawDebts[debtor][creditor];
				if (amount <= 0) continue;
				if (creditor === currentUserId && debtor !== currentUserId) {
					owedToUser[debtor] = (owedToUser[debtor] || 0) + amount;
				} else if (debtor === currentUserId && creditor !== currentUserId) {
					userOwes[creditor] = (userOwes[creditor] || 0) + amount;
				}
			}
		}

		return { owedToUser, userOwes };
	}, [user?._id, items]);

	const formatAmount = (amt) => (amt ? amt.toFixed(2) : "0.00");

	const renderActionButtons = (memberId, direction) => {
		const request = settlementRequests?.[memberId];

		if (request) {
			const outgoing = request.from === user._id && request.type === "outgoing";
			if (outgoing) {
				const timeRemaining = getSettlementTimeRemaining(memberId);
				return (
					<div className={classes.pendingRequest}>
						<FaHourglassHalf className={classes.pendingIcon} />
						<span>Awaiting response ({timeRemaining}s)</span>
						<button
							className={`${classes.actionBtn} ${classes.rejectBtn}`}
							onClick={() => cancelSettlementRequest(memberId)}
						>
							Cancel
						</button>
					</div>
				);
			} else {
				// Incoming request
				return (
					<div className={classes.requestActions}>
						<button
							className={`${classes.actionBtn} ${classes.acceptBtn}`}
							onClick={() => {
								// For NetBalance, we need to get the bilateral item IDs like in Dashboard
								// For now, pass empty array - this could be enhanced to get actual item IDs
								acceptSettlement(memberId, []);
							}}
						>
							Accept
						</button>
						<button className={`${classes.actionBtn} ${classes.rejectBtn}`} onClick={() => declineSettlement(memberId)}>
							Decline
						</button>
					</div>
				);
			}
		}

		return (
			<button
				onClick={() => {
					const amount = direction === "owedToUser" ? owedToUser[memberId] : userOwes[memberId];
					settleUp(memberId, user?.name, amount); // Simplified call
				}}
				className={`${classes.actionBtn} ${classes.resolveBtn}`}
			>
				Settle Up <FaExchangeAlt className={classes.resolveIcon} />
			</button>
		);
	};

	const renderBalances = () => {
		const hasOwed = Object.keys(owedToUser).length > 0;
		const hasOwes = Object.keys(userOwes).length > 0;

		if (!hasOwed && !hasOwes) {
			return <p className={classes.noBalances}>No outstanding balances</p>;
		}

		return (
			<div className={classes.balancesSection}>
				{/* Section: Others owe you */}
				{hasOwed && (
					<div className={classes.incomingSection}>
						<h4 className={classes.sectionTitle}>Others owe you</h4>
						{Object.entries(owedToUser).map(([memberId, amount]) => {
							const member = houseMembers.find((m) => m._id.toString() === memberId);
							if (!amount || amount <= 0) return null;
							return (
								<div key={memberId} className={classes.memberBalance}>
									<div className={classes.memberHeader}>
										<p className={classes.memberName}>{member ? member.name : "Unknown"}</p>
										<div className={classes.netAmount}>
											<span className={`${classes.netValue} ${classes.positive}`}>+${formatAmount(amount)}</span>
										</div>
									</div>
									<div className={classes.balanceDetails}>
										<div className={classes.balanceRow}>
											<span className={classes.balanceLabel}>
												<FaArrowDown className={classes.balanceIcon} />
												They owe you
											</span>
											<span className={classes.owedAmount}>${formatAmount(amount)}</span>
										</div>
									</div>
									<div className={classes.actionSection}>{renderActionButtons(memberId, "owedToUser")}</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Section: You owe others */}
				{hasOwes && (
					<div className={classes.incomingSection}>
						{" "}
						{/* Reusing incomingSection for consistent styling */}
						<h4 className={classes.sectionTitle}>You owe others</h4>
						{Object.entries(userOwes).map(([memberId, amount]) => {
							const member = houseMembers.find((m) => m._id.toString() === memberId);
							if (!amount || amount <= 0) return null;
							return (
								<div key={memberId} className={classes.memberBalance}>
									<div className={classes.memberHeader}>
										<p className={classes.memberName}>{member ? member.name : "Unknown"}</p>
										<div className={classes.netAmount}>
											<span className={`${classes.netValue} ${classes.negative}`}>-${formatAmount(amount)}</span>
										</div>
									</div>
									<div className={classes.balanceDetails}>
										<div className={classes.balanceRow}>
											<span className={classes.balanceLabel}>
												<FaArrowUp className={classes.balanceIcon} />
												You owe them
											</span>
											<span className={classes.owingAmount}>${formatAmount(amount)}</span>
										</div>
									</div>
									<div className={classes.actionSection}>{renderActionButtons(memberId, "userOwes")}</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	console.log("Items:", items);
	console.log("House Members:", houseMembers);
	console.log("Current User:", user);
	console.log("Final balances:", { owedToUser, userOwes });

	return (
		<div className={classes.netBalanceContainer}>
			<h3 className={classes.title}>
				<FaExchangeAlt className={classes.titleIcon} />
				Net Balances
			</h3>
			{renderBalances()}
		</div>
	);
};

export default NetBalance;
