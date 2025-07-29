import React, { useState, useEffect, useCallback } from "react";
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

	// Fetch transactions and stats from backend
	useEffect(() => {
		const fetchData = async () => {
			try {
				const txRes = await axios.get("/api/payment-transactions");
				// If backend returns { success, data: { transactions, pagination } }
				const transactions = txRes.data?.data?.transactions || txRes.data?.data || txRes.data?.transactions || [];
				setPaymentTransactions(transactions);

				// Fetch stats
				const statsRes = await axios.get("/api/payment-transactions/statistics");
				setPaymentStats(statsRes.data?.data || {});
			} catch (err) {
				setError(err.response?.data?.message || "Failed to load payment history");
			}
		};
		fetchData();
	}, []);

	// Filter and sort transactions (placeholder, replace with your logic)
	const filteredTransactions = paymentTransactions; // Add filter/sort logic as needed

	// Render transaction items (single card for settlements, green for owed, red for owing)
	const renderTransactionItems = useCallback(
		(transaction) => {
			if (transaction.transactionType === "settlement") {
				return (
					<div className={classes.transactionItems}>
						<div className={classes.itemsTitle}>Settlement Items:</div>
						<div className={classes.settlementBreakdown}>
							{transaction.items?.map((item, index) => {
								const perspective = item.perspectives?.find((p) => p.userId === user?._id);
								return (
									<div
										key={index}
										className={classes.settlementItem}
										style={{
											color:
												perspective?.itemType === "owed"
													? "#2ecc40"
													: perspective?.itemType === "owing"
													? "#ff4136"
													: undefined,
										}}
									>
										<span className={classes.itemName}>{item.name}</span>
										<span>
											{perspective?.itemType === "owed"
												? `+${perspective?.amount?.toFixed(2) || "0.00"}`
												: perspective?.itemType === "owing"
												? `-${perspective?.amount?.toFixed(2) || "0.00"}`
												: `$${perspective?.amount?.toFixed(2) || "0.00"}`}
										</span>
										<span style={{ marginLeft: 8, color: "#888" }}>
											(${item.price?.toFixed(2) || item.originalPrice?.toFixed(2) || "0.00"})
										</span>
									</div>
								);
							})}
						</div>
					</div>
				);
			} else {
				return (
					<div className={classes.transactionItems}>
						<div className={classes.itemsTitle}>Items included:</div>
						<div className={classes.paymentItems}>
							{transaction.items?.map((item, index) => (
								<div key={index} className={classes.paymentItem}>
									<span className={classes.itemName}>{item.name}</span>
									<span className={classes.itemAmount}>${item.yourShare?.toFixed(2) || "0.00"}</span>
								</div>
							))}
						</div>
					</div>
				);
			}
		},
		[user?._id]
	);

	// Error block
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
							// Add logic to refetch transactions
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

	// Main render section
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
										onChange={(e) => setTransactionFilter(e.target.value)}
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
										onChange={(e) => setSortFilter(e.target.value)}
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
										let transactionIcon, transactionTitle, transactionSubtitle, transactionAmount;
										let isPositive = false;
										if (transaction.transactionType === "settlement") {
											transactionIcon = <FaExchangeAlt />;
											// Find the other user for subtitle
											const otherUser = transaction.users?.find((u) => u.id !== user?._id);
											transactionTitle = `Settlement`;
											transactionSubtitle = otherUser?.name || "Unknown";
											// Calculate sum of owed and owing for current user
											let sumOwed = 0,
												sumOwing = 0;
											transaction.items?.forEach((item) => {
												const perspective = item.perspectives?.find((p) => p.userId === user?._id);
												if (perspective?.itemType === "owed") {
													sumOwed += perspective.amount || 0;
												} else if (perspective?.itemType === "owing") {
													sumOwing += perspective.amount || 0;
												}
											});
											// If owed is greater, green; if owing is greater, red
											isPositive = sumOwed >= sumOwing;
											// Show net amount (owed - owing)
											const netAmount = sumOwed - sumOwing;
											transactionAmount = `${netAmount >= 0 ? "+" : "-"}$${Math.abs(netAmount).toFixed(2)}`;
										} else {
											const isPaymentMade = transaction.userId?._id === user?._id;
											const otherParty = isPaymentMade ? transaction.paidTo?.name : transaction.userId?.name;
											if (transaction.method === "Bulk Payment") {
												transactionIcon = <FaHandHoldingUsd />;
												transactionTitle = isPaymentMade ? "Bulk Payment Made" : "Bulk Payment Received";
												transactionSubtitle = isPaymentMade
													? `To ${otherParty || "Unknown"}`
													: `From ${otherParty || "Unknown"}`;
											} else {
												transactionIcon = <FaReceipt />;
												transactionTitle = isPaymentMade ? "Single Payment Made" : "Single Payment Received";
												transactionSubtitle = isPaymentMade
													? `To ${otherParty || "Unknown"}`
													: `From ${otherParty || "Unknown"}`;
											}
											transactionAmount = `${isPaymentMade ? "-" : "+"}$${
												transaction.totalAmount?.toFixed(2) || "0.00"
											}`;
											isPositive = !isPaymentMade;
										}
										return (
											<div key={transaction._id} className={classes.transactionCard}>
												<div className={classes.transactionHeader}>
													<div className={classes.transactionLeft}>
														<div
															className={`${classes.transactionIcon} ${
																transaction.transactionType === "settlement"
																	? classes.settlementIcon
																	: transaction.method === "Bulk Payment"
																	? classes.bulkIcon
																	: classes.singleIcon
															}`}
														>
															{transactionIcon}
														</div>
														<div className={classes.transactionInfo}>
															<div className={classes.transactionTitle}>{transactionTitle}</div>
															<div className={classes.transactionSubtitle}>{transactionSubtitle}</div>
															<div className={classes.transactionMeta}>
																<span className={classes.transactionDate}>{formatDateTime(transaction.createdAt)}</span>
																<span className={classes.transactionBadge}>
																	{transaction.transactionType === "settlement" ? "Settlement" : transaction.method}
																</span>
															</div>
														</div>
													</div>
													<div className={classes.transactionRight}>
														<div
															className={`${classes.transactionAmount} ${
																isPositive ? classes.positive : classes.negative
															}`}
														>
															{transactionAmount}
														</div>
														<div className={classes.transactionItemCount}>
															{transaction.itemCount || 0} item{(transaction.itemCount || 0) !== 1 ? "s" : ""}
														</div>
													</div>
												</div>
												{transaction.items && transaction.items.length > 0 && (
													<div className={classes.transactionExpanded}>{renderTransactionItems(transaction)}</div>
												)}
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
