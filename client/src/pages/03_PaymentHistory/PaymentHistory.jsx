import React, { useState, useEffect, useMemo, useCallback } from "react";
import classes from "./PaymentHistory.module.css";
import { FaHistory, FaReceipt, FaHandHoldingUsd, FaExchangeAlt } from "react-icons/fa";
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
		settlements: 0,
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
		} else if (transactionFilter === "settlement") {
			filtered = filtered.filter((transaction) => transaction.transactionType === "settlement");
		} else if (transactionFilter === "payments") {
			filtered = filtered.filter(
				(transaction) =>
					transaction.transactionType === "single_payment" || transaction.transactionType === "bulk_payment"
			);
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

	// Render transaction items
	const renderTransactionItems = useCallback(
		(transaction, isPaymentMade) => (
			<div className={classes.transactionItems}>
				{transaction.transactionType === "settlement" ? (
					<>
						<div className={classes.itemsTitle}>Settlement Details:</div>
						<div className={classes.settlementSections}>
							{transaction.items?.filter((item) => item.itemType === "owed").length > 0 && (
								<div className={classes.settlementSection}>
									<div className={classes.sectionTitle}>Items you were owed:</div>
									<div className={classes.itemsGrid}>
										{transaction.items
											.filter((item) => item.itemType === "owed")
											.map((item, index) => (
												<div key={`owed-${index}`} className={classes.transactionItem}>
													<span className={classes.itemName}>{item.name}</span>
													<span className={`${classes.itemAmount} ${classes.paymentIn}`}>
														+${item.yourShare?.toFixed(2) || "0.00"}
													</span>
												</div>
											))}
									</div>
								</div>
							)}
							{transaction.items?.filter((item) => item.itemType === "owing").length > 0 && (
								<div className={classes.settlementSection}>
									<div className={classes.sectionTitle}>Items you owed:</div>
									<div className={classes.itemsGrid}>
										{transaction.items
											.filter((item) => item.itemType === "owing")
											.map((item, index) => (
												<div key={`owing-${index}`} className={classes.transactionItem}>
													<span className={classes.itemName}>{item.name}</span>
													<span className={`${classes.itemAmount} ${classes.paymentOut}`}>
														-${item.yourShare?.toFixed(2) || "0.00"}
													</span>
												</div>
											))}
									</div>
								</div>
							)}
						</div>
					</>
				) : (
					<>
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
					</>
				)}
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
										<option value="payments">Payments Only</option>
										<option value="settlement">Settlements Only</option>
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
										let isPaymentMade, otherParty, transactionTitle;

										if (transaction.transactionType === "settlement") {
											// For settlement transactions
											const isInitiator = transaction.userId?._id === user?._id;
											otherParty = isInitiator ? transaction.settlementWith?.name : transaction.userId?.name;

											if (isInitiator) {
												// You initiated the settlement
												if (transaction.settlementDirection === "paying") {
													isPaymentMade = true;
													transactionTitle = `Settled debt with ${otherParty || "Unknown"}`;
												} else {
													isPaymentMade = false;
													transactionTitle = `Collected from ${otherParty || "Unknown"}`;
												}
											} else {
												// You were the settlement partner
												if (transaction.settlementDirection === "paying") {
													isPaymentMade = false;
													transactionTitle = `Settlement from ${otherParty || "Unknown"}`;
												} else {
													isPaymentMade = true;
													transactionTitle = `Paid settlement to ${otherParty || "Unknown"}`;
												}
											}
										} else {
											// Regular payment transactions
											isPaymentMade = transaction.userId?._id === user?._id;
											otherParty = isPaymentMade ? transaction.paidTo?.name : transaction.userId?.name;
											transactionTitle = isPaymentMade
												? `Paid ${otherParty || "Unknown"}`
												: `Received from ${otherParty || "Unknown"}`;
										}

										return (
											<div key={transaction._id} className={classes.transactionCard}>
												<div className={classes.transactionMain}>
													<div className={classes.transactionLeft}>
														<div className={classes.transactionIcon}>
															{transaction.transactionType === "settlement" ? <FaHandHoldingUsd /> : <FaReceipt />}
														</div>
														<div className={classes.transactionDetails}>
															<div className={classes.transactionTitle}>{transactionTitle}</div>
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
															{transaction.transactionType === "settlement" ? (
																<>
																	<div className={classes.netAmount}>
																		{isPaymentMade ? "-" : "+"}$
																		{Math.abs(transaction.netAmount || transaction.totalAmount || 0).toFixed(2)}
																	</div>
																	{transaction.owedItemsTotal > 0 && transaction.owingItemsTotal > 0 && (
																		<div className={classes.settlementBreakdown}>
																			<small>
																				Owed: ${transaction.owedItemsTotal.toFixed(2)} | Owing: $
																				{transaction.owingItemsTotal.toFixed(2)}
																			</small>
																		</div>
																	)}
																</>
															) : (
																`${isPaymentMade ? "-" : "+"}$${transaction.totalAmount?.toFixed(2) || "0.00"}`
															)}
														</div>
														<div className={classes.transactionItemCount}>
															{transaction.itemCount || 0} item
															{(transaction.itemCount || 0) > 1 ? "s" : ""}
															{transaction.transactionType === "settlement" && (
																<div className={classes.settlementLabel}>Settlement</div>
															)}
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
							<div className={classes.statCard}>
								<div className={classes.statIcon}>
									<FaExchangeAlt />
								</div>
								<div className={classes.statContent}>
									<div className={classes.statValue}>{paymentStats.settlements || 0}</div>
									<div className={classes.statLabel}>Settlements</div>
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
