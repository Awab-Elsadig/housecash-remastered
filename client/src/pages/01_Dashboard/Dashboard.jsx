import React, { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { PiHandDepositFill } from "react-icons/pi";
import { FaExchangeAlt } from "react-icons/fa";
import classes from "./Dashboard.module.css";
import { useUser } from "../../hooks/useUser";
import { useInitialLoading } from "../../hooks/useLoading";
import { DashboardSkeleton } from "../../components/Skeleton";
import { useSettlement } from "../../contexts/useSettlement";
import formatCurrency from "../../utils/formatCurrency";
import axios from "axios";
import ably from "../../ablyConfig";
import { useDashboardData, buildDetailItems, bilateralItemIds } from "../../hooks/useDashboardData";

const Dashboard = () => {
	const { user, houseMembers, items, fetchItems, updateItems } = useUser();
	const {
		settlementRequests,
		settleUp,
		acceptSettlement,
		declineSettlement,
		cancelSettlementRequest,
		getSettlementTimeRemaining,
	} = useSettlement();
	const isLoading = useInitialLoading(500);
	const rollbackRef = useRef(null);

	// Realtime refresh
	useEffect(() => {
		if (!user?.houseCode) return;
		const channel = ably.channels.get(`house:${user.houseCode}`);
		const refresh = () => fetchItems();
		["fetchUpdate", "itemUpdate", "paymentNotification"].forEach((evt) => channel.subscribe(evt, refresh));
		return () =>
			["fetchUpdate", "itemUpdate", "paymentNotification"].forEach((evt) => channel.unsubscribe(evt, refresh));
	}, [fetchItems, user?.houseCode]);

	const { paymentsByMember, netPerMember, bilateral, totals } = useDashboardData(
		user?._id?.toString(),
		items,
		houseMembers
	);

	const [detailMemberId, setDetailMemberId] = useState(null);
	const [, forceUpdate] = useState(0);
	const closeDetail = useCallback(() => setDetailMemberId(null), []);

	// Force re-render every second when there are active settlement requests
	useEffect(() => {
		const hasActiveRequests = Object.keys(settlementRequests).length > 0;
		if (!hasActiveRequests) return;
		const interval = setInterval(() => {
			forceUpdate((prev) => prev + 1);
		}, 1000);
		return () => clearInterval(interval);
	}, [settlementRequests, forceUpdate]);

	const detailItems = useMemo(
		() => buildDetailItems(user?._id?.toString(), detailMemberId, items),
		[detailMemberId, items, user?._id]
	);

	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") closeDetail();
		};
		if (detailMemberId) window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [detailMemberId, closeDetail]);

	const payItem = useCallback(
		async (itemId) => {
			if (!user?._id) return;
			const snapshot = items;
			try {
				const item = items.find((i) => i._id === itemId);
				if (!item) return;
				const members = item.members.map((m) =>
					m.userID.toString() === user._id.toString() ? { ...m, paid: !m.paid } : m
				);
				const updated = items.map((i) => (i._id === itemId ? { ...i, members } : i));
				rollbackRef.current = snapshot;
				updateItems(updated);
				await axios.patch(`/api/items/update-item/${itemId}`, { ...item, members });
				fetchItems();
			} catch (e) {
				console.error(e);
				if (rollbackRef.current) updateItems(rollbackRef.current);
			}
		},
		[items, updateItems, user?._id, fetchItems]
	);

	const payAllToMember = useCallback(
		async (memberId) => {
			if (!user?._id) return;
			const snapshot = items;
			try {
				const updated = items.map((item) => {
					if (item.author.toString() !== memberId || item.author.toString() === user._id.toString()) return item;
					const members = item.members.map((m) =>
						m.userID.toString() === user._id.toString() ? { ...m, paid: true } : m
					);
					return { ...item, members };
				});
				rollbackRef.current = snapshot;
				updateItems(updated);
				await axios.patch("/api/items/pay-all", { memberId, userId: user._id });
				fetchItems();
			} catch (e) {
				console.error(e);
				if (rollbackRef.current) updateItems(rollbackRef.current);
			}
		},
		[items, updateItems, user?._id, fetchItems]
	);

	const getBilateralItemIds = useCallback(
		(memberId) => bilateralItemIds(user?._id?.toString(), memberId, items),
		[items, user?._id]
	);

	const finalizeSettlement = async () => {
		try {
			await fetchItems();
		} catch (e) {
			console.error("Post-settlement refresh failed", e);
		}
	};

	const settlementActionButtons = (memberId, signedAmount) => {
		const req = settlementRequests?.[memberId];
		if (req) {
			const outgoing = req.fromUserId === user._id && req.type === "outgoing";
			if (outgoing) {
				const timeRemaining = getSettlementTimeRemaining(memberId);
				return (
					<div className={classes.settlePending}>
						<span>Awaiting response ({timeRemaining}s)</span>
						<button
							onClick={() => cancelSettlementRequest(memberId)}
							aria-label="Cancel settlement request"
							className={classes.btnGhost}
						>
							Cancel
						</button>
					</div>
				);
			}
			return (
				<div className={classes.settleIncoming}>
					<button
						onClick={async () => {
							const ids = getBilateralItemIds(memberId);
							const result = await acceptSettlement(memberId, ids);
							if (result?.success) {
								if (result.settlementProcessed) {
									alert(`Settlement completed successfully! ${ids.length} items marked as settled.`);
								} else {
									alert("Settlement accepted, but there was an issue processing the items.");
								}
							} else {
								alert(`Settlement failed: ${result?.message || "An unknown error occurred."}`);
							}
							finalizeSettlement();
						}}
						className={classes.btnPrimary}
						aria-label="Accept settlement"
					>
						Accept
					</button>
					<button
						onClick={async () => {
							const result = await declineSettlement(memberId);
							if (result.success) {
								alert("Settlement declined.");
							} else {
								alert(`Failed to decline settlement: ${result.message || "An unknown error occurred."}`);
							}
						}}
						className={classes.btnGhost}
						aria-label="Decline settlement"
					>
						Decline
					</button>
				</div>
			);
		}
		return (
			<button
				className={classes.btnPrimary}
				onClick={() => {
					const targetMember = houseMembers.find((m) => m._id.toString() === memberId);
					settleUp(memberId, user?.name, Math.abs(signedAmount), targetMember?.name);
				}}
				aria-label="Send settlement request"
			>
				Settle <FaExchangeAlt />
			</button>
		);
	};

	if (isLoading || !user) {
		return (
			<div className={classes.dashboard}>
				<DashboardSkeleton />
			</div>
		);
	}

	const paymentEntries = Object.entries(paymentsByMember);
	const netEntries = Object.entries(netPerMember).sort((a, b) => a[0].localeCompare(b[0]));

	return (
		<>
			<div className={classes.dashboard}>
				<div className={classes.summaryGrid} aria-label="Financial summary">
					<div className={classes.statCard} data-type="owing">
						<span className={classes.statLabel}>You Owe</span>
						<span className={classes.statNumber}>{formatCurrency(totals.owing)}</span>
						<span className={classes.statSub}>Across items you haven't paid</span>
					</div>
					<div className={classes.statCard} data-type="owed">
						<span className={classes.statLabel}>Owed To You</span>
						<span className={classes.statNumber}>{formatCurrency(totals.owed)}</span>
						<span className={classes.statSub}>Others still owe you</span>
					</div>
					<div
						className={classes.statCard}
						data-type="net"
						data-positive={totals.net >= 0}
						aria-live="polite"
						aria-label={`Net balance ${totals.net >= 0 ? "positive" : "negative"}`}
					>
						<span className={classes.statLabel}>Net</span>
						<span className={classes.statNumber}>{formatCurrency(totals.net)}</span>
						<span className={classes.statSub}>{totals.net >= 0 ? "In your favor" : "You owe overall"}</span>
					</div>
				</div>

				<section className={`${classes.panel} ${classes.netPanel}`} aria-labelledby="net-heading">
					<h2 id="net-heading" className={classes.panelTitle}>
						Net balances
					</h2>
					{netEntries.length === 0 && <p className={classes.empty}>No outstanding balances</p>}
					<ul className={classes.netList}>
						{netEntries.map(([memberId, amount]) => {
							const member = houseMembers.find((m) => m._id.toString() === memberId);
							const positive = amount > 0; // they owe user
							const breakdown = bilateral[memberId] || {
								theyOwe: positive ? amount : 0,
								youOwe: positive ? 0 : Math.abs(amount),
								total: Math.abs(amount),
							};
							return (
								<li
									key={memberId}
									className={classes.netRow}
									data-positive={positive}
									onClick={() => setDetailMemberId(memberId)}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => e.key === "Enter" && setDetailMemberId(memberId)}
									aria-label={`Details for ${member?.name}`}
								>
									<div className={classes.netAccent} aria-hidden="true" />
									<div className={classes.netLeft}>
										<span className={classes.netName}>{member?.name || "Member"}</span>
										<div className={classes.netFigures}>
											<div className={classes.figure}>
												<span className={classes.figLabel}>Total</span>
												<span
													className={`${classes.figValue} ${
														positive ? classes.figTotalPositive : amount < 0 ? classes.figTotalNegative : ""
													}`}
												>
													{formatCurrency(breakdown.total)}
												</span>
											</div>
											<div className={classes.figure}>
												<span className={classes.figLabel}>Owed</span>
												<span className={`${classes.figValue} ${classes.positive}`}>
													{formatCurrency(breakdown.theyOwe)}
												</span>
											</div>
											<div className={classes.figure}>
												<span className={classes.figLabel}>Owe</span>
												<span className={`${classes.figValue} ${classes.negative}`}>
													{formatCurrency(breakdown.youOwe)}
												</span>
											</div>
										</div>
									</div>
									<div className={classes.netActions} onClick={(e) => e.stopPropagation()}>
										{settlementActionButtons(memberId, amount)}
									</div>
								</li>
							);
						})}
					</ul>
				</section>

				<section className={classes.panel} aria-labelledby="pending-heading">
					<h2 id="pending-heading" className={classes.panelTitle}>
						Pending payments
					</h2>
					<div id="pending-section">
						{paymentEntries.length === 0 && <p className={classes.empty}>You're all settled ✅</p>}
						{paymentEntries.map(([memberId, data]) => (
							<article key={memberId} className={classes.card}>
								<header className={classes.cardHead}>
									<h3 className={classes.cardTitle}>{data.memberInfo?.name?.split(" ")[0] || "Member"}</h3>
									<button
										onClick={() => payAllToMember(memberId)}
										className={classes.btnSmall}
										aria-label="Pay all to member"
									>
										Pay all <PiHandDepositFill />
									</button>
								</header>
								<ul className={classes.itemList}>
									{data.items.map((it) => (
										<li key={it._id} className={classes.itemRow}>
											<span className={classes.itemName}>{it.name}</span>
											<span className={classes.itemMoney}>
												<span className={classes.share}>{formatCurrency(it.share)}</span>
												<span className={classes.ofTotal}>/ {formatCurrency(it.price)}</span>
												<button onClick={() => payItem(it._id)} className={classes.btnIcon} aria-label="Mark item paid">
													<PiHandDepositFill />
												</button>
											</span>
										</li>
									))}
								</ul>
								<footer className={classes.cardFoot}>
									<span>Total</span>
									<span className={classes.totalOwing}>{formatCurrency(data.total)}</span>
								</footer>
							</article>
						))}
					</div>
				</section>
			</div>
			{detailMemberId ? (
				<div
					className={classes.modalOverlay}
					role="dialog"
					aria-modal="true"
					aria-labelledby="detail-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) closeDetail();
					}}
				>
					<div className={classes.modal}>
						<header className={classes.modalHeader}>
							<h3 id="detail-title" className={classes.modalTitle}>
								Details – {houseMembers.find((m) => m._id.toString() === detailMemberId)?.name || "Member"}
							</h3>
							<button className={classes.modalClose} aria-label="Close details" onClick={closeDetail}>
								×
							</button>
						</header>
						<div className={classes.modalSummary}>
							{(() => {
								const b = bilateral[detailMemberId] || { theyOwe: 0, youOwe: 0, total: 0 };
								return (
									<div className={classes.modalStats}>
										<div className={classes.mStat}>
											<span>Total</span>
											<strong>{formatCurrency(b.total)}</strong>
										</div>
										<div className={classes.mStat}>
											<span>Owed</span>
											<strong className={classes.positive}>{formatCurrency(b.theyOwe)}</strong>
										</div>
										<div className={classes.mStat}>
											<span>Owe</span>
											<strong className={classes.negative}>{formatCurrency(b.youOwe)}</strong>
										</div>
									</div>
								);
							})()}
						</div>
						<ul className={classes.modalItems}>
							{detailItems.length === 0 && <li className={classes.empty}>No direct unsettled items</li>}
							{detailItems.map((it) => (
								<li key={it.id} className={classes.modalItem} data-direction={it.direction}>
									<span className={classes.itemName}>{it.name}</span>
									<span className={classes.itemShare}>{formatCurrency(it.share)}</span>
									<span className={classes.itemDirection} data-direction={it.direction}>
										{it.direction === "theyOwe" ? "Owed to you" : "You owe"}
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			) : null}
		</>
	);
};

export default Dashboard;
