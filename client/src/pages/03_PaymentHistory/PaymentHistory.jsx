import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from "../../hooks/useUser";
import formatCurrency from "../../utils/formatCurrency";
import { format, parseISO } from "date-fns";
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
		if (!payment.settledItemIds || payment.settledItemIds.length === 0) {
			return <p className={classes.noItems}>No items found for this settlement.</p>;
		}

		const owedItems = [];
		const owingItems = [];

		payment.settledItemIds.forEach((item) => {
			const shareAmount = item.price / (item.members?.length || 1);
			if (item.author === currentUserId) {
				owedItems.push({ ...item, shareAmount });
			} else {
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
		<div className={classes.modalOverlay} onClick={onClose}>
			<div className={classes.modalContent} onClick={(e) => e.stopPropagation()}>
				<div className={classes.modalHeader}>
					<div className={classes.modalTitleSection}>
						<FaExchangeAlt className={classes.modalIcon} />
						<div>
							<h3 className={classes.modalTitle}>Settlement Details</h3>
							<p className={classes.modalSubtitle}>
								Settlement with {otherUser.name} • {format(parseISO(payment.createdAt), "MMM d, yyyy")}
							</p>
						</div>
					</div>
					<button className={classes.closeBtn} onClick={onClose}>
						<FaTimes />
					</button>
				</div>

				<div className={classes.modalBody}>{renderSettlementBreakdown()}</div>
			</div>
		</div>
	);
};

const PaymentHistory = () => {
	const { user } = useUser();
	const [payments, setPayments] = useState([]);
	const [filteredPayments, setFilteredPayments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [typeFilter, setTypeFilter] = useState("all");
	const [directionFilter, setDirectionFilter] = useState("all");
	const [selectedPayment, setSelectedPayment] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

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
		if (!user?._id) return { totalTransactions: 0, totalSent: 0, totalReceived: 0, settlements: 0 };

		const totalTransactions = payments.length;
		const totalSent = payments.filter((p) => p.fromUser?._id === user._id).reduce((sum, p) => sum + p.amount, 0);
		const totalReceived = payments.filter((p) => p.toUser?._id === user._id).reduce((sum, p) => sum + p.amount, 0);
		const settlements = payments.filter((p) => p.type === "settlement").length;

		return { totalTransactions, totalSent, totalReceived, settlements };
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

	const handleViewDetails = (payment) => {
		if (payment.type === "settlement") {
			setSelectedPayment(payment);
			setIsModalOpen(true);
		}
	};

	const stats = getPaymentStats();

	if (loading || !user) {
		return (
			<div className={classes.historyPage}>
				<div className={classes.loadingState}>
					<FaHistory className={classes.loadingIcon} />
					<p>Loading payment history...</p>
				</div>
			</div>
		);
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
			<div className={classes.sidebar}>
				<h2 className={classes.sidebarTitle}>Overview</h2>
				<div className={classes.statsGrid}>
					<div className={classes.statCard}>
						<div className={classes.statIcon}>
							<FaHistory />
						</div>
						<div className={classes.statContent}>
							<div className={classes.statValue}>{stats.totalTransactions}</div>
							<div className={classes.statLabel}>Total Transactions</div>
						</div>
					</div>
					<div className={classes.statCard}>
						<div className={classes.statIcon}>
							<FaArrowUp />
						</div>
						<div className={classes.statContent}>
							<div className={classes.statValue}>{formatCurrency(stats.totalSent)}</div>
							<div className={classes.statLabel}>Total Sent</div>
						</div>
					</div>
					<div className={classes.statCard}>
						<div className={classes.statIcon}>
							<FaArrowDown />
						</div>
						<div className={classes.statContent}>
							<div className={classes.statValue}>{formatCurrency(stats.totalReceived)}</div>
							<div className={classes.statLabel}>Total Received</div>
						</div>
					</div>
					<div className={classes.statCard}>
						<div className={classes.statIcon}>
							<FaExchangeAlt />
						</div>
						<div className={classes.statContent}>
							<div className={classes.statValue}>{stats.settlements}</div>
							<div className={classes.statLabel}>Settlements</div>
						</div>
					</div>
				</div>
			</div>

			<div className={classes.mainContent}>
				<div className={classes.filtersHeader}>
					<h1 className={classes.filtersTitle}>Payment History</h1>
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
											{p.type === "settlement" && (
												<button className={classes.viewDetailsBtn} onClick={() => handleViewDetails(p)}>
													<FaEye />
													View Details
												</button>
											)}
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
