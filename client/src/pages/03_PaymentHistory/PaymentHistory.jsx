import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../../hooks/useUser";
import { useDataLoading } from "../../hooks/useLoading";
import { PaymentHistorySkeleton } from "../../components/Skeleton";
import formatCurrency from "../../utils/formatCurrency";
import { format, parseISO } from "date-fns";
import { RiDeleteBin6Line } from "react-icons/ri";
import classes from "./PaymentHistory.module.css";
import {
	FaAngleDown,
	FaAngleUp,
	FaExchangeAlt,
	FaUser,
	FaUsers,
	FaDollarSign,
	FaHistory,
	FaArrowUp,
	FaArrowDown,
	FaEye,
	FaTimes,
} from "react-icons/fa";

const SettlementDetailsModal = ({ payment, isOpen, onClose, currentUserId }) => {
	if (!isOpen || !payment || payment.type !== "settlement" || !currentUserId) return null;

	const isPayer = payment.fromUser?._id === currentUserId;
	const otherUser = isPayer ? payment.toUser : payment.fromUser;

	// Calculate settlement breakdown
	const renderSettlementBreakdown = () => {
		// Prefer server snapshot if available
		const snap = payment.settlementSnapshot;
		const snapItems = Array.isArray(payment.settlementItems) ? payment.settlementItems : [];
		if (snap && snapItems.length > 0) {
			// From payer perspective net = youOwe - theyOwe; if viewer is not payer, invert
			const payerView = isPayer ? snap : { theyOwe: snap.youOwe, youOwe: snap.theyOwe, net: -snap.net };
			// Compute net from visible perspective to avoid sign confusion
			const netDisplay = (Number(payerView.theyOwe) || 0) - (Number(payerView.youOwe) || 0);
			const itemsView = snapItems.map((it) => ({
				name: it.name,
				share: it.share,
				direction: isPayer ? it.direction : it.direction === "theyOwe" ? "youOwe" : "theyOwe",
			}));

			return (
				<>
					<div className={classes.modalSummary}>
						<div className={classes.modalStat}>
							<span>Net Balance</span>
							<strong className={netDisplay < 0 ? classes.negative : classes.positive}>{formatCurrency(netDisplay)}</strong>
						</div>
						<div className={classes.modalStat}>
							<span>They Owed You</span>
							<strong className={classes.positive}>{formatCurrency(payerView.theyOwe)}</strong>
						</div>
						<div className={classes.modalStat}>
							<span>You Owed Them</span>
							<strong className={classes.negative}>{formatCurrency(payerView.youOwe)}</strong>
						</div>
					</div>
					<ul className={classes.modalItemList}>
						{itemsView.length === 0 ? (
							<li className={classes.empty}>No direct items found for this settlement.</li>
						) : (
							itemsView.map((item, idx) => (
								<li key={idx} className={classes.modalItem} data-direction={item.direction}>
									<span className={classes.itemName}>{item.name}</span>
									<div className={classes.modalItemDetails}>
										<span className={classes.itemShare} data-direction={item.direction}>{formatCurrency(item.share)}</span>
										<span className={classes.itemDirection}>{item.direction === "theyOwe" ? "Owed to you" : "You owed"}</span>
									</div>
								</li>
							))
						)}
					</ul>
				</>
			);
		}
		if (!payment.settledItemIds || payment.settledItemIds.length === 0) {
			return (
				<div className={classes.netSummary}>
					<div className={classes.netRow}>
						<span className={classes.netLabel}>Net Settlement:</span>
						<span className={`${classes.netValue} ${isPayer ? classes.negative : classes.positive}`}>
							{isPayer ? "-" : "+"}
							{formatCurrency(Math.abs(payment.amount))}
						</span>
					</div>
					<div className={classes.netDescription}>
						{isPayer
							? `You paid ${otherUser?.name || "member"} ${formatCurrency(Math.abs(payment.amount))}`
							: `${otherUser?.name || "member"} paid you ${formatCurrency(Math.abs(payment.amount))}`}
					</div>
				</div>
			);
		}

		// If settledItemIds are IDs only, show compact summary
		const first = payment.settledItemIds[0];
		const itemsAppearAsObjects = typeof first === "object" && first !== null;
		if (!itemsAppearAsObjects) {
			return (
				<div className={classes.netSummary}>
					<div className={classes.netRow}>
						<span className={classes.netLabel}>Items Settled:</span>
						<span className={classes.netValue}>{payment.settledItemIds.length}</span>
					</div>
					<div className={classes.netRow}>
						<span className={classes.netLabel}>Net Settlement:</span>
						<span className={`${classes.netValue} ${isPayer ? classes.negative : classes.positive}`}>
							{isPayer ? "-" : "+"}
							{formatCurrency(Math.abs(payment.amount))}
						</span>
					</div>
					<div className={classes.netDescription}>
						{isPayer
							? `You paid ${otherUser?.name || "member"} ${formatCurrency(Math.abs(payment.amount))}`
							: `${otherUser?.name || "member"} paid you ${formatCurrency(Math.abs(payment.amount))}`}
					</div>
				</div>
			);
		}

		// Build snapshot like Net Balance details
		const owedItems = [];
		const owingItems = [];

		payment.settledItemIds.forEach((item) => {
			const shareAmount = item.price / (item.members?.length || 1);

			// If current user is the author and other user is a member, other user owes current user
			if (item.author === currentUserId && item.members?.some((member) => member.userID === otherUser._id)) {
				owedItems.push({ ...item, shareAmount });
			}
			// If other user is the author and current user is a member, current user owes other user
			else if (item.author === otherUser._id && item.members?.some((member) => member.userID === currentUserId)) {
				owingItems.push({ ...item, shareAmount });
			}
		});

		const totalOwed = owedItems.reduce((sum, item) => sum + item.shareAmount, 0);
		const totalOwing = owingItems.reduce((sum, item) => sum + item.shareAmount, 0);
		const netAmount = totalOwed - totalOwing;

		return (
			<div className={classes.settlementBreakdown}>
				{owedItems.length > 0 && (
					<div className={classes.settlementCategory}>
						<div className={classes.categoryHeader}>
							<span className={classes.categoryTitle}>
								<FaArrowDown className={classes.categoryIcon} />
								{otherUser.name} owed you
							</span>
							<span className={`${classes.categoryAmount} ${classes.positive}`}>+{formatCurrency(totalOwed)}</span>
						</div>
						<div className={classes.itemsList}>
							{owedItems.map((item) => (
								<div key={item._id} className={classes.settlementItem}>
									<span className={classes.itemName}>{item.name}</span>
									<span className={classes.owedAmount}>+{formatCurrency(item.shareAmount)}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{owingItems.length > 0 && (
					<div className={classes.settlementCategory}>
						<div className={classes.categoryHeader}>
							<span className={classes.categoryTitle}>
								<FaArrowUp className={classes.categoryIcon} />
								You owed {otherUser.name}
							</span>
							<span className={`${classes.categoryAmount} ${classes.negative}`}>-{formatCurrency(totalOwing)}</span>
						</div>
						<div className={classes.itemsList}>
							{owingItems.map((item) => (
								<div key={item._id} className={classes.settlementItem}>
									<span className={classes.itemName}>{item.name}</span>
									<span className={classes.owingAmount}>-{formatCurrency(item.shareAmount)}</span>
								</div>
							))}
						</div>
					</div>
				)}

				<div className={classes.netSummary}>
					<div className={classes.netRow}>
						<span className={classes.netLabel}>Net Settlement:</span>
						<span className={`${classes.netValue} ${netAmount >= 0 ? classes.positive : classes.negative}`}>
							{netAmount >= 0 ? "+" : ""}
							{formatCurrency(Math.abs(netAmount))}
						</span>
					</div>
					<div className={classes.netDescription}>
						{netAmount >= 0
							? `${otherUser.name} paid you ${formatCurrency(Math.abs(netAmount))}`
							: `You paid ${otherUser.name} ${formatCurrency(Math.abs(netAmount))}`}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className={classes.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
			<div className={classes.modal} onClick={(e) => e.stopPropagation()}>
				<header className={classes.modalHeader}>
					<h3 className={classes.modalTitle}>Settlement Details with {otherUser.name}</h3>
					<button className={classes.modalClose} onClick={onClose} aria-label="Close modal">
						<FaTimes />
					</button>
				</header>
				{renderSettlementBreakdown()}
			</div>
		</div>
	);
};


const PaymentHistory = () => {
	useEffect(() => {
		document.title = "Payment History - HouseCash";
	}, []);

	const { user } = useUser();
	const [payments, setPayments] = useState([]);
	const [filteredPayments, setFilteredPayments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [typeFilter, setTypeFilter] = useState("all");
	const [directionFilter, setDirectionFilter] = useState("all");
	const [selectedPayment, setSelectedPayment] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Comprehensive loading check - wait for all data to be processed
	const dataReady =
		!loading &&
		user &&
		payments !== null &&
		payments !== undefined &&
		filteredPayments !== null &&
		filteredPayments !== undefined;

	const isLoading = useDataLoading(dataReady);
	useEffect(() => {
		const fetchPayments = async () => {
			try {
				const { data } = await axios.get("/api/payments");
				setPayments(data);
				setFilteredPayments(data);
			} catch (err) {
				setError("Failed to fetch payment history.");
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchPayments();
	}, []);

	useEffect(() => {
		if (!user?._id) return; // Exit early if user is not loaded

		let filtered = [...payments];

		// Filter by type
		if (typeFilter !== "all") {
			filtered = filtered.filter((p) => p.type === typeFilter);
		}

		// Filter by direction
		if (directionFilter !== "all") {
			if (directionFilter === "sent") {
				filtered = filtered.filter((p) => p.fromUser?._id === user._id);
			} else if (directionFilter === "received") {
				filtered = filtered.filter((p) => p.toUser?._id === user._id);
			}
		}

		setFilteredPayments(filtered);
	}, [payments, typeFilter, directionFilter, user?._id]);

	const getPaymentStats = () => {
		if (!user?._id)
			return {
				totalTransactions: 0,
				totalSent: 0,
				totalReceived: 0,
				settlements: 0,
				singlePayments: 0,
				bulkPayments: 0,
			};

		const totalTransactions = payments.length;
		const totalSent = payments.filter((p) => p.fromUser?._id === user._id).reduce((sum, p) => sum + p.amount, 0);
		const totalReceived = payments.filter((p) => p.toUser?._id === user._id).reduce((sum, p) => sum + p.amount, 0);
		const settlements = payments.filter((p) => p.type === "settlement").length;
		const singlePayments = payments.filter((p) => p.type === "single").length;
		const bulkPayments = payments.filter((p) => p.type === "bulk").length;

		return { totalTransactions, totalSent, totalReceived, settlements, singlePayments, bulkPayments };
	};

	const getPaymentTitle = (p) => {
		if (!user?._id) return "Payment";
		const isPayer = p.fromUser?._id === user._id;
		switch (p.type) {
			case "settlement":
				return `Settlement with ${isPayer ? p.toUser?.name : p.fromUser?.name}`;
			case "bulk":
				return `Bulk Payment ${isPayer ? "to" : "from"} ${isPayer ? p.toUser?.name : p.fromUser?.name}`;
			case "single":
				return `Payment for "${p.settledItemId?.name || "item"}" ${isPayer ? "to" : "from"} ${
					isPayer ? p.toUser?.name : p.fromUser?.name
				}`;
			default:
				return "Payment";
		}
	};

	const getPaymentIcon = (type) => {
		switch (type) {
			case "settlement":
				return <FaExchangeAlt />;
			case "bulk":
				return <FaUsers />;
			case "single":
				return <FaUser />;
			default:
				return <FaDollarSign />;
		}
	};

	const openSettlementDetails = async (payment) => {
		try {
			const hasArray = Array.isArray(payment?.settledItemIds);
			const hasObjects = hasArray && payment.settledItemIds.length > 0 && typeof payment.settledItemIds[0] === "object";
			if (!hasArray || !hasObjects) {
				const { data } = await axios.get(`/api/payments/${payment._id}`);
				setSelectedPayment(data || payment);
			} else {
				setSelectedPayment(payment);
			}
			setIsModalOpen(true);
		} catch (e) {
			// Fallback to given payment
			setSelectedPayment(payment);
			setIsModalOpen(true);
		}
	};

	const handleViewDetails = (payment) => {
		if (payment.type === "settlement") {
			openSettlementDetails(payment);
		}
	};

	const stats = getPaymentStats();

	const handleDelete = async (paymentId) => {
		if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
		try {
			await axios.delete(`/api/payments/${paymentId}`);
			setPayments((prev) => prev.filter((p) => p._id !== paymentId));
			setFilteredPayments((prev) => prev.filter((p) => p._id !== paymentId));
		} catch (err) {
			console.error("Failed to delete payment", err);
			alert("Failed to delete payment");
		}
	};

	if (isLoading) {
		return <PaymentHistorySkeleton />;
	}

	if (error) {
		return (
			<div className={classes.historyPage}>
				<div className={classes.errorState}>
					<p>{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={classes.historyPage}>
			{/* Stats Grid */}
			<div className={classes.statsGrid}>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<FaHistory />
					</div>
					<div className={classes.statNumber}>{stats.totalTransactions}</div>
					<div className={classes.statLabel}>Total Transactions</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<FaArrowUp />
					</div>
					<div className={classes.statNumber}>{formatCurrency(stats.totalSent)}</div>
					<div className={classes.statLabel}>Total Sent</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<FaArrowDown />
					</div>
					<div className={classes.statNumber}>{formatCurrency(stats.totalReceived)}</div>
					<div className={classes.statLabel}>Total Received</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<FaExchangeAlt />
					</div>
					<div className={classes.statNumber}>{stats.settlements}</div>
					<div className={classes.statLabel}>Settlements</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<FaUser />
					</div>
					<div className={classes.statNumber}>{stats.singlePayments}</div>
					<div className={classes.statLabel}>Single Payments</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<FaUsers />
					</div>
					<div className={classes.statNumber}>{stats.bulkPayments}</div>
					<div className={classes.statLabel}>Bulk Payments</div>
				</div>
			</div>

			{/* Main Content Section */}
			<div className={classes.mainContent}>
				<div className={classes.filtersHeader}>
					<div className={classes.transactionsFilters}>
						<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={classes.filterSelect}>
							<option value="all">All Types</option>
							<option value="settlement">Settlements</option>
							<option value="bulk">Bulk Payments</option>
							<option value="single">Single Payments</option>
						</select>
						<select
							value={directionFilter}
							onChange={(e) => setDirectionFilter(e.target.value)}
							className={classes.filterSelect}
						>
							<option value="all">All Directions</option>
							<option value="sent">Sent</option>
							<option value="received">Received</option>
						</select>
					</div>
				</div>

				{filteredPayments.length === 0 ? (
					<div className={classes.noTransactions}>
						<div className={classes.noTransactionsIcon}>
							<FaHistory />
						</div>
						<h3>No payment history found</h3>
						<p>You haven't made or received any payments yet. Start by settling up with your housemates!</p>
					</div>
				) : (
					<div className={classes.transactionsList}>
						{filteredPayments.map((p) => {
							const isPayer = p.fromUser?._id === user?._id;
							return (
								<div key={p._id} className={classes.transactionCard}>
									<div className={classes.transactionHeader}>
										<div className={classes.transactionLeft}>
											<div className={`${classes.transactionIcon} ${classes[`${p.type}Icon`]}`}>
												{getPaymentIcon(p.type)}
											</div>
											<div className={classes.transactionInfo}>
												<div className={classes.transactionTitle}>{getPaymentTitle(p)}</div>
												<div className={classes.transactionSubtitle}>
													{p.type === "settlement" && p.settledItemIds?.length > 0
														? `${p.settledItemIds.length} items settled`
														: p.description || "No description"}
												</div>
												<div className={classes.transactionMeta}>
													<span className={classes.transactionDate}>
														{format(parseISO(p.createdAt), "MMM d, yyyy 'at' h:mm a")}
													</span>
													<span className={classes.transactionBadge}>{p.type}</span>
												</div>
											</div>
										</div>
										<div className={classes.transactionRight}>
											<div className={`${classes.transactionAmount} ${isPayer ? classes.negative : classes.positive}`}>
												{isPayer ? "-" : "+"}
												{formatCurrency(p.amount)}
											</div>
											{p.settledItemIds?.length > 0 && (
												<div className={classes.transactionItemCount}>
													{p.settledItemIds.length} item{p.settledItemIds.length !== 1 ? "s" : ""}
												</div>
											)}
											<div className={classes.actionButtons}>
												{p.type === "settlement" && (
													<button className={classes.viewDetailsBtn} onClick={() => handleViewDetails(p)}>
														<FaEye />
														View Details
													</button>
												)}
												<button className={classes.deleteBtn} onClick={() => handleDelete(p._id)}>
													<RiDeleteBin6Line />
													Delete
												</button>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<SettlementDetailsModal
				payment={selectedPayment}
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false);
					setSelectedPayment(null);
				}}
				currentUserId={user?._id}
			/>
		</div>
	);
};

export default PaymentHistory;

