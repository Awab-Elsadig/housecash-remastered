import React, { useState, useEffect, useCallback } from "react";
import formatCurrency from "../../../utils/formatCurrency";
import classes from "../Dashboard.module.css";
import { FaExchangeAlt } from "react-icons/fa";
import { bilateralItemIds } from "../../../hooks/useDashboardData";
import Tooltip from "../../../components/Tooltip";

const SettlementTimer = ({ memberId, getSettlementTimeRemaining }) => {
	const [time, setTime] = useState(getSettlementTimeRemaining(memberId));
	useEffect(() => {
		const timer = setInterval(() => {
			const remaining = getSettlementTimeRemaining(memberId);
			setTime(remaining);
			if (remaining <= 0) {
				clearInterval(timer);
			}
		}, 1000);
		return () => clearInterval(timer);
	}, [memberId, getSettlementTimeRemaining]);

	if (time <= 0) return null;
	return <span>({time}s)</span>;
};

const SettlementButtons = ({ memberId, amount, user, houseMembers, settlementContext, items }) => {
	const {
		settlementRequests,
		settleUp,
		acceptSettlement,
		declineSettlement,
		cancelSettlementRequest,
		getSettlementTimeRemaining,
	} = settlementContext;

	// Track which action is loading, not a generic flag
	const [loadingAction, setLoadingAction] = useState(null); // 'settle' | 'accept' | 'decline' | null

	// Reset loading when the underlying request state flips for this member so we don't carry loading into the new UI
	const req = settlementRequests?.[memberId];
	useEffect(() => {
		setLoadingAction(null);
	}, [!!req, req?.fromUserId, req?.toUserId, req?.expiresAt]);

	const getBilateralIds = useCallback(() => {
		const currentUserId = user?._id || (() => { try { return JSON.parse(sessionStorage.getItem('user')||'{}')._id; } catch { return null; } })();
		return bilateralItemIds(currentUserId?.toString(), memberId, items);
	}, [user, memberId, items]);

	if (req) {
		const isOutgoing = req.fromUserId === user._id;
		if (isOutgoing) {
			const handleCancel = async () => {
				// Don't show loading state for cancel - make it completely optimistic
				try {
					await cancelSettlementRequest(memberId);
				} catch (error) {
					console.error("Cancel failed:", error);
					// Could show a toast notification here if needed
				}
			};
			return (
				<div className={classes.settlePending}>
					<span>
						Awaiting response{" "}
						<SettlementTimer memberId={memberId} getSettlementTimeRemaining={getSettlementTimeRemaining} />
					</span>
					<Tooltip content="Cancel this settlement request" position="top">
						<button 
							onClick={handleCancel} 
							className={classes.btnGhost}
						>
							Cancel
						</button>
					</Tooltip>
				</div>
			);
		}

		const handleAccept = async () => {
			setLoadingAction('accept');
			try {
				const ids = getBilateralIds();
				await acceptSettlement(memberId, ids);
			} finally {
				setTimeout(() => setLoadingAction(null), 500);
			}
		};
		const handleDecline = async () => {
			setLoadingAction('decline');
			try {
				await declineSettlement(memberId);
			} finally {
				setTimeout(() => setLoadingAction(null), 500);
			}
		};
		return (
			<div className={classes.settleIncoming}>
				<span>
					Settlement request{" "}
					<SettlementTimer memberId={memberId} getSettlementTimeRemaining={getSettlementTimeRemaining} />
				</span>
				<div>
					<Tooltip content="Accept and settle all outstanding items with this member" position="top">
						<button
							onClick={handleAccept}
							className={`${classes.btnPrimary} ${loadingAction === 'accept' ? classes.loading : ''}`}
							disabled={loadingAction === 'accept'}
						>
							{loadingAction === 'accept' ? 'Processing...' : 'Accept'}
						</button>
					</Tooltip>
					<Tooltip content="Decline this settlement request" position="top">
						<button 
							onClick={handleDecline} 
							className={`${classes.btnGhost} ${loadingAction === 'decline' ? classes.loading : ''}`}
							disabled={loadingAction === 'decline'}
						>
							{loadingAction === 'decline' ? 'Declining...' : 'Decline'}
						</button>
					</Tooltip>
				</div>
			</div>
		);
	}

	const handleSettle = async () => {
		setLoadingAction('settle');
		try {
			const targetMember = houseMembers.find((m) => m._id.toString() === memberId);
			await settleUp(memberId, user?.name, Math.abs(amount), targetMember?.name);
		} finally {
			setTimeout(() => setLoadingAction(null), 500);
		}
	};

	return (
		<Tooltip content="Send a settlement request to clear balances" position="top">
			<button
				className={`${classes.btnPrimary} ${loadingAction === 'settle' ? classes.loading : ''}`}
				onClick={handleSettle}
				disabled={loadingAction === 'settle'}
			>
				{loadingAction === 'settle' ? 'Sending...' : 'Settle'} <FaExchangeAlt />
			</button>
		</Tooltip>
	);
};

const NetBalanceRow = ({
	memberId,
	amount,
	houseMembers,
	bilateral,
	setDetailMemberId,
	settlementContext,
	user,
	items,
}) => {
	const member = houseMembers.find((m) => m._id.toString() === memberId);
	if (!member) return null;

	const positive = amount > 0;
	const breakdown = bilateral[memberId] || {
		theyOwe: positive ? amount : 0,
		youOwe: positive ? 0 : Math.abs(amount),
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setDetailMemberId(memberId);
		}
	};

	const initials = (member.name || "")
		.split(" ")
		.map((p) => p[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<li
			className={classes.netRow}
			data-positive={positive}
			onClick={() => setDetailMemberId(memberId)}
			role="button"
			tabIndex={0}
			onKeyDown={handleKeyDown}
			aria-label={`Details for ${member.name}, net ${formatCurrency(Math.abs(amount))}`}
		>
			<div className={classes.netAccent} />
			<div className={classes.netAvatar} aria-hidden>{initials}</div>
			<div className={classes.netMemberInfo}>
				<span className={classes.netName}>{member.name}</span>
				<div className={classes.netBreakdown}>
					<span className={classes.positive}>{formatCurrency(breakdown.theyOwe)}</span>
					<span className={classes.negative}>{formatCurrency(breakdown.youOwe)}</span>
				</div>
			</div>
			<div className={classes.netTotal} data-positive={positive}>
				{formatCurrency(Math.abs(amount))}
			</div>
			<div className={classes.netActions} onClick={(e) => e.stopPropagation()}>
				<SettlementButtons
					memberId={memberId}
					amount={amount}
					user={user}
					houseMembers={houseMembers}
					settlementContext={settlementContext}
					items={items}
				/>
			</div>
		</li>
	);
};

const NetBalances = ({ netPerMember, houseMembers, bilateral, setDetailMemberId, settlementContext, user, items }) => {
	const netEntries = Object.entries(netPerMember || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

	return (
		<section className={classes.panel} aria-labelledby="net-heading">
			<h2 id="net-heading" className={classes.panelTitle}>
				Net Balances
			</h2>
			{netEntries.length === 0 ? (
				<p className={classes.empty}>No outstanding balances with anyone. All settled up!</p>
			) : (
				<ul className={classes.netList}>
					{netEntries.map(([memberId, amount]) => (
						<NetBalanceRow
							key={memberId}
							memberId={memberId}
							amount={amount}
							houseMembers={houseMembers}
							bilateral={bilateral}
							setDetailMemberId={setDetailMemberId}
							settlementContext={settlementContext}
							user={user}
							items={items}
						/>
					))}
				</ul>
			)}
		</section>
	);
};

export default NetBalances;
