import React, { useState, useEffect, useMemo, useCallback } from "react";
import classes from "./PaymentHistory.module.css";
import { FaHistory, FaReceipt, FaHandHoldingUsd, FaTrash } from "react-icons/fa";
import { MdPayment, MdDashboard } from "react-icons/md";
import { PiHandDepositFill } from "react-icons/pi";
import { useInitialLoading } from "../../hooks/useLoading";
import { PaymentHistorySkeleton } from "../../components/Skeleton";
import formatDateTime from "../../utils/formatDateTime";
import axios from "axios";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";

const PaymentHistory = () => {
	const { user } = useUser();
	const navigate = useNavigate();
	const isLoading = useInitialLoading(1200);

	const [paymentTransactions, setPaymentTransactions] = useState([]);
	const [paymentStats, setPaymentStats] = useState({
		totalTransactions: 0,
		totalPaid: 0,
		bulkPayments: 0,
		singlePayments: 0,
		mostFrequentRecipient: "None",
	});
	const [transactionFilter, setTransactionFilter] = useState("all");
	const [sortFilter, setSortFilter] = useState("recent");
	const [error, setError] = useState(null);

	// Memoized API functions
	const fetchPaymentTransactions = useCallback(async () => {
		try {
			setError(null);
			const response = await axios.get("/api/payment-transactions", {
				withCredentials: true,
			});
			if (response.data.success) {
				setPaymentTransactions(response.data.data.transactions || []);
			}
		} catch (error) {
			console.error("Error fetching payment transactions:", error);
			setError("Failed to load payment transactions");
		}
	}, []);

	const fetchPaymentStatistics = useCallback(async () => {
		try {
			const response = await axios.get("/api/payment-transactions/statistics", {
				withCredentials: true,
			});
			if (response.data.success) {
				setPaymentStats(response.data.data);
			}
		} catch (error) {
			console.error("Error fetching payment statistics:", error);
		}
	}, []);

	// Initialize data on component mount
	useEffect(() => {
		fetchPaymentTransactions();
		fetchPaymentStatistics();
	}, [fetchPaymentTransactions, fetchPaymentStatistics]);

	// Memoized filtered and sorted transactions
	const filteredTransactions = useMemo(() => {
		let filtered = [...paymentTransactions];

		// Apply transaction type filter
		if (transactionFilter === "bulk") {
			filtered = filtered.filter((transaction) => transaction.method === "Bulk Payment");
		} else if (transactionFilter === "single") {
			filtered = filtered.filter((transaction) => transaction.method === "Individual Payment");
		}

		// Apply sort filter
		if (sortFilter === "recent") {
			filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
		} else if (sortFilter === "oldest") {
			filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
		} else if (sortFilter === "amount") {
			filtered.sort((a, b) => b.totalAmount - a.totalAmount);
		}

		return filtered;
	}, [paymentTransactions, transactionFilter, sortFilter]);

	const handleTransactionFilterChange = useCallback((e) => {
		setTransactionFilter(e.target.value);
	}, []);

	const handleSortFilterChange = useCallback((e) => {
		setSortFilter(e.target.value);
	}, []);

	// Optimized delete function with better error handling
	const deleteTransaction = useCallback(
		async (transactionId) => {
			try {
				const response = await axios.delete(`/api/payment-transactions/${transactionId}`, {
					withCredentials: true,
				});

				if (response.data.success) {
					// Remove the transaction from the local state
					setPaymentTransactions((prev) => prev.filter((t) => t._id !== transactionId));
					// Refresh statistics after deletion
					fetchPaymentStatistics();
					return { success: true };
				}
			} catch (error) {
				console.error("Error deleting transaction:", error);
				return {
					success: false,
					error: error.response?.data?.message || "Failed to delete transaction",
				};
			}
		},
		[fetchPaymentStatistics]
	);

	// Handle delete with confirmation
	const handleDeleteTransaction = useCallback(
		async (transactionId, transactionTitle) => {
			if (
				window.confirm(
					`Are you sure you want to delete the transaction "${transactionTitle}"? This action cannot be undone.`
				)
			) {
				const result = await deleteTransaction(transactionId);
				if (!result.success) {
					alert(result.error || "Failed to delete transaction");
				}
			}
		},
		[deleteTransaction]
	);

	// Render transaction items
	const renderTransactionItems = useCallback(
		(transaction, isPaymentMade) => (
			<div className={classes.transactionItems}>
				<div className={classes.itemsTitle}>Items:</div>
				<div className={classes.itemsGrid}>
					{transaction.items?.map((item, index) => (
						<div key={index} className={classes.transactionItem}>
							<span className={classes.itemName}>{item.name}</span>
							<span className={`${classes.itemAmount} ${isPaymentMade ? classes.paymentOut : classes.paymentIn}`}>
								${item.yourShare?.toFixed(2) || "0.00"}
							</span>
						</div>
					))}
				</div>
			</div>
		),
		[]
	);

	// Error state
	if (error) {
		return (
			<div className={classes.historyPage}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						alignItems: "center",
						height: "400px",
						color: "var(--badColor)",
						textAlign: "center",
					}}
				>
					<h3>Error Loading Payment History</h3>
					<p>{error}</p>
					<button
						onClick={() => {
							setError(null);
							fetchPaymentTransactions();
						}}
						style={{
							background: "var(--mainColor)",
							border: "none",
							padding: "0.5rem 1rem",
							borderRadius: "0.5rem",
							color: "white",
							cursor: "pointer",
						}}
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={classes.historyPage}>
			{isLoading ? (
				<PaymentHistorySkeleton />
			) : (
				<>
					<div className={classes.mainContent}>
						<div className={classes.transactionsSection}>
							<div className={classes.filtersHeader}>
								<h3 className={classes.filtersTitle}>Filter & Sort Transactions ({filteredTransactions.length})</h3>
								<div className={classes.transactionsFilters}>
									<select
										className={classes.filterSelect}
										value={transactionFilter}
										onChange={handleTransactionFilterChange}
										title="Filter by transaction type"
									>
										<option value="all">All Transactions</option>
										<option value="bulk">Bulk Payments</option>
										<option value="single">Single Payments</option>
									</select>
									<select
										className={classes.filterSelect}
										value={sortFilter}
										onChange={handleSortFilterChange}
										title="Sort transactions"
									>
										<option value="recent">Most Recent</option>
										<option value="oldest">Oldest First</option>
										<option value="amount">By Amount</option>
									</select>
								</div>
							</div>

							<div className={classes.transactionsList}>
								{filteredTransactions.length > 0 ? (
									filteredTransactions.map((transaction) => {
										const isPaymentMade = transaction.userId?._id === user?._id;
										const otherParty = isPaymentMade ? transaction.paidTo?.name : transaction.userId?.name;

										return (
											<div key={transaction._id} className={classes.transactionCard}>
												<div className={classes.transactionMain}>
													<div className={classes.transactionLeft}>
														<div className={classes.transactionIcon}>
															<FaReceipt />
														</div>
														<div className={classes.transactionDetails}>
															<div className={classes.transactionTitle}>
																{isPaymentMade
																	? `Paid ${otherParty || "Unknown"}`
																	: `Received from ${otherParty || "Unknown"}`}
															</div>
															<div className={classes.transactionMeta}>
																<span className={classes.transactionDate}>{formatDateTime(transaction.createdAt)}</span>
																<span className={classes.transactionType}>{transaction.method}</span>
															</div>
														</div>
													</div>
													<div className={classes.transactionRight}>
														<div
															className={`${classes.transactionAmount} ${
																isPaymentMade ? classes.paymentOut : classes.paymentIn
															}`}
														>
															{isPaymentMade ? "-" : "+"}${transaction.totalAmount?.toFixed(2) || "0.00"}
														</div>
														<div className={classes.transactionItemCount}>
															{transaction.itemCount || 0} item
															{(transaction.itemCount || 0) > 1 ? "s" : ""}
														</div>
													</div>
												</div>

												{transaction.items &&
													transaction.items.length > 0 &&
													renderTransactionItems(transaction, isPaymentMade)}

												<div className={classes.transactionFooter}>
													<div className={classes.transactionStatus}>
														<span className={classes.statusBadge}>{transaction.status || "Completed"}</span>
													</div>
													<div className={classes.transactionActions}>
														<button
															className={classes.deleteBtn}
															onClick={() =>
																handleDeleteTransaction(
																	transaction._id,
																	isPaymentMade
																		? `Paid ${otherParty || "Unknown"}`
																		: `Received from ${otherParty || "Unknown"}`
																)
															}
															title="Delete Transaction"
														>
															<FaTrash className={classes.deleteIcon} />
														</button>
													</div>
												</div>
											</div>
										);
									})
								) : (
									<div className={classes.noTransactions}>
										<div className={classes.noTransactionsIcon}>
											<FaHistory />
										</div>
										<h3>No Payment History</h3>
										<p>Your payment transactions will appear here once you start paying for items.</p>
										<button className={classes.startPayingBtn} onClick={() => navigate("/dashboard")}>
											<MdDashboard className={classes.startIcon} />
											Go to Dashboard
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className={classes.sidebar}>
						<h3 className={classes.sidebarTitle}>Payment Statistics</h3>
						<div className={classes.statsGrid}>
							<div className={classes.statCard}>
								<div className={classes.statIcon}>
									<FaReceipt />
								</div>
								<div className={classes.statContent}>
									<div className={classes.statValue}>{paymentStats.totalTransactions}</div>
									<div className={classes.statLabel}>Total Transactions</div>
								</div>
							</div>
							<div className={classes.statCard}>
								<div className={classes.statIcon}>
									<MdPayment />
								</div>
								<div className={classes.statContent}>
									<div className={classes.statValue}>${paymentStats.totalPaid?.toFixed(2) || "0.00"}</div>
									<div className={classes.statLabel}>Total Paid</div>
								</div>
							</div>
							<div className={classes.statCard}>
								<div className={classes.statIcon}>
									<FaHandHoldingUsd />
								</div>
								<div className={classes.statContent}>
									<div className={classes.statValue}>{paymentStats.bulkPayments}</div>
									<div className={classes.statLabel}>Bulk Payments</div>
								</div>
							</div>
							<div className={classes.statCard}>
								<div className={classes.statIcon}>
									<PiHandDepositFill />
								</div>
								<div className={classes.statContent}>
									<div className={classes.statValue}>{paymentStats.singlePayments}</div>
									<div className={classes.statLabel}>Single Payments</div>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default PaymentHistory;
