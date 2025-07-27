import React, { useEffect, useState } from "react";
import classes from "./Expenses.module.css";
import { RiDeleteBin6Line } from "react-icons/ri";
import { RiPencilFill } from "react-icons/ri";
import { RiSearchLine } from "react-icons/ri";
import { useUser } from "../../hooks/useUser";
import { useInitialLoading } from "../../hooks/useLoading";
import { ExpensesSkeleton } from "../../components/Skeleton";
import formatDateTime from "../../utils/formatDateTime";
import AddItem from "../../components/AddItem/AddItem";
import DeleteConfirmation from "../../pages/Expenses/components/DeleteConfirmation/DeleteConfirmation";
import axios from "axios";
import socket from "../../socketConfig";

const Expenses = () => {
	const { user, houseMembers, items, fetchItems } = useUser();
	const isLoading = useInitialLoading(1000);
	const [filteredItems, setFilteredItems] = useState([]);
	const [selectedFilter, setSelectedFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [showAddItem, setShowAddItem] = useState(false);
	const [itemToEdit, setItemToEdit] = useState(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState(false);
	const [itemToDelete, setItemToDelete] = useState(null);
	const [expandedItem, setExpandedItem] = useState(null);
	// Pagination state
	const [itemsPerPage] = useState(50);
	const [currentPage, setCurrentPage] = useState(1);
	const [displayedItems, setDisplayedItems] = useState([]);

	useEffect(() => {
		// Items will be automatically fetched by useUser hook when user data is available
	}, []);

	// Fuzzy search function
	const fuzzySearch = (query, text) => {
		if (!query) return true;
		const queryLower = query.toLowerCase();
		const textLower = text.toLowerCase();

		// Exact match
		if (textLower.includes(queryLower)) return true;

		// Fuzzy matching - check if characters appear in order
		let queryIndex = 0;
		for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
			if (textLower[i] === queryLower[queryIndex]) {
				queryIndex++;
			}
		}
		return queryIndex === queryLower.length;
	};

	// Enhanced filtering logic
	const applyFilters = () => {
		if (!user?._id) {
			setFilteredItems([]);
			setDisplayedItems([]);
			setCurrentPage(1);
			return;
		}

		let filtered = items;

		// Apply primary filter
		switch (selectedFilter) {
			case "all":
				filtered = items;
				break;
			case "my-expenses":
				filtered = items.filter((item) => item.author === user._id);
				break;
			case "i-owe":
				filtered = items.filter((item) => {
					const userMember = item.members.find((member) => member.userID === user._id);
					return userMember && !userMember.paid && item.author !== user._id;
				});
				break;
			case "owed-to-me":
				filtered = items.filter((item) => {
					if (item.author !== user._id) return false;
					return item.members.some((member) => member.userID !== user._id && !member.paid);
				});
				break;
			default:
				// Individual member filter - filter by payer only
				filtered = items.filter((item) => item.author === selectedFilter);
		}

		// Apply search filter
		if (searchQuery) {
			filtered = filtered.filter((item) => {
				const payerName = getPayerName(item.author);
				const payerUsername = getPayerNickname(item.author);

				return (
					fuzzySearch(searchQuery, item.name) ||
					fuzzySearch(searchQuery, payerName) ||
					fuzzySearch(searchQuery, payerUsername)
				);
			});
		}

		// Sort by date (most recent first) - this is the key change
		filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		setFilteredItems(filtered);
		// Reset pagination when filters change
		setCurrentPage(1);
		// Show first page of items (most recent 50)
		setDisplayedItems(filtered.slice(0, itemsPerPage));
	};

	// Function to load more items
	const loadMoreItems = () => {
		const nextPage = currentPage + 1;
		const startIndex = currentPage * itemsPerPage;
		const endIndex = nextPage * itemsPerPage;

		// Append new items to existing displayed items
		const newItems = filteredItems.slice(startIndex, endIndex);
		setDisplayedItems((prev) => [...prev, ...newItems]);
		setCurrentPage(nextPage);

		// Scroll to the newly added content after a brief delay
		setTimeout(() => {
			const showMoreButton = document.querySelector(`.${classes.showMoreContainer}`);
			if (showMoreButton) {
				showMoreButton.scrollIntoView({ behavior: "smooth", block: "end" });
			}
		}, 100);
	};

	// Check if there are more items to load
	const hasMoreItems = displayedItems.length < filteredItems.length;

	useEffect(() => {
		applyFilters();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items, selectedFilter, searchQuery, user?._id]);

	// Count functions for filter badges
	const getFilterCounts = () => {
		if (!user?._id) return { myExpenses: 0, iOwe: 0, owedToMe: 0 };

		const myExpenses = items.filter((item) => item.author === user._id).length;
		const iOwe = items.filter((item) => {
			const userMember = item.members.find((member) => member.userID === user._id);
			return userMember && !userMember.paid && item.author !== user._id;
		}).length;
		const owedToMe = items.filter((item) => {
			if (item.author !== user._id) return false;
			return item.members.some((member) => member.userID !== user._id && !member.paid);
		}).length;

		return { myExpenses, iOwe, owedToMe };
	};

	const handleEdit = (item) => {
		setItemToEdit(item);
		setShowAddItem(true);
	};

	const handleDelete = (item) => {
		setItemToDelete(item);
		setDeleteConfirmation(true);
	};

	const handlePayment = async (itemId) => {
		if (!user?._id) return;

		try {
			// Find the user's membership in this item
			const item = items.find((i) => i._id === itemId);
			const userMember = item.members.find((member) => member.userID === user._id);

			if (!userMember) {
				alert("You're not a member of this expense");
				return;
			}

			// Toggle payment status
			const response = await axios.patch(`/api/items/${itemId}/payment`, {
				userId: user._id,
				paid: !userMember.paid,
			});

			if (response.data.success) {
				// Update the items state to reflect the change
				fetchItems();

				// Emit socket event to notify other users
				socket.emit("itemUpdated", {
					itemId,
					userId: user._id,
					action: userMember.paid ? "unpaid" : "paid",
				});
			}
		} catch (error) {
			console.error("Payment update failed:", error);
			alert("Failed to update payment status");
		}
	};

	const getPayerName = (authorId) => {
		const member = houseMembers.find((m) => m._id === authorId);
		return member ? member.name.split(" ")[0] : "Unknown";
	};

	const getPayerNickname = (authorId) => {
		const member = houseMembers.find((m) => m._id === authorId);
		if (!member) return "?";
		return member.username || member.name?.split(" ")[0] || "Unknown";
	};

	const calculateUserShare = (item) => {
		return item.price / item.members.length;
	};

	const isUserOwedMoney = (item) => {
		return item.author === user._id;
	};

	const getPaymentOverviewStats = () => {
		// Total Monthly Spending - sum of all expenses you're part of
		const totalMonthlySpending = items.reduce((sum, item) => sum + item.price, 0);

		// Total Monthly Share - sum of only your shares
		const totalMonthlyShare = items.reduce((sum, item) => {
			if (item.members.some((member) => member.userID === user._id)) {
				return sum + item.price / item.members.length;
			}
			return sum;
		}, 0);

		// Average Expense Amount
		const averageExpense = items.length > 0 ? totalMonthlySpending / items.length : 0;

		// Most Expensive Item
		const mostExpensiveAmount = items.length > 0 ? Math.max(...items.map((item) => item.price)) : 0;

		// Most Active Payer - who created the most expenses
		const payerCounts = {};
		items.forEach((item) => {
			payerCounts[item.author] = (payerCounts[item.author] || 0) + 1;
		});

		let mostActivePayer = "No one";
		if (Object.keys(payerCounts).length > 0) {
			const mostActivePayerId = Object.keys(payerCounts).reduce((a, b) => (payerCounts[a] > payerCounts[b] ? a : b));
			const payerMember = houseMembers.find((m) => m._id === mostActivePayerId);
			mostActivePayer = payerMember ? payerMember.name.split(" ")[0] : "Unknown";
		}

		return {
			totalMonthlySpending,
			totalMonthlyShare,
			averageExpense,
			mostExpensiveAmount,
			mostActivePayer,
		};
	};

	const getMemberUsername = (memberId) => {
		const member = houseMembers.find((m) => m._id === memberId);
		if (!member) return "?";
		return member.username || member.name?.split(" ")[0] || "Unknown";
	};

	const getMemberName = (memberId) => {
		const member = houseMembers.find((m) => m._id === memberId);
		return member ? member.name.split(" ")[0] : "Unknown";
	};

	const getPaymentProgress = (item) => {
		if (!item.members || item.members.length === 0) return { paid: 0, total: 0, percentage: 0 };

		// If user is the author, show how many have paid
		if (item.author === user._id) {
			const otherMembers = item.members.filter((member) => member.userID !== user._id);
			const totalMembers = otherMembers.length;
			const paidMembers = otherMembers.filter((member) => member.paid).length;
			return {
				paid: paidMembers,
				total: totalMembers,
				percentage: totalMembers > 0 ? (paidMembers / totalMembers) * 100 : 100,
			};
		}

		// If user is a member, show if they've paid
		const userMember = item.members.find((member) => member.userID === user._id);
		return {
			paid: userMember?.paid ? 1 : 0,
			total: 1,
			percentage: userMember?.paid ? 100 : 0,
		};
	};

	return (
		<div className={classes.expenses}>
			{isLoading || !user ? (
				<ExpensesSkeleton />
			) : (
				<>
					<div className={classes.mainExpenses}>
						<div className={classes.mainExpensesTop}>
							<div className={classes.filtersContainer}>
								<div className={classes.searchContainer}>
									<RiSearchLine className={classes.searchIcon} />
									<input
										type="text"
										placeholder="Search expenses, payers..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className={classes.searchInput}
									/>
								</div>
								<div className={classes.filters}>
									<div className={classes.primaryFilters}>
										<button
											onClick={() => setSelectedFilter("all")}
											className={`${classes.filterButton} ${selectedFilter === "all" ? classes.active : ""}`}
										>
											All ({items.length})
										</button>
										<button
											onClick={() => setSelectedFilter("my-expenses")}
											className={`${classes.filterButton} ${selectedFilter === "my-expenses" ? classes.active : ""}`}
										>
											My Expenses ({getFilterCounts().myExpenses})
										</button>
										<button
											onClick={() => setSelectedFilter("i-owe")}
											className={`${classes.filterButton} ${selectedFilter === "i-owe" ? classes.active : ""}`}
										>
											I Owe ({getFilterCounts().iOwe})
										</button>
										<button
											onClick={() => setSelectedFilter("owed-to-me")}
											className={`${classes.filterButton} ${selectedFilter === "owed-to-me" ? classes.active : ""}`}
										>
											Owed to Me ({getFilterCounts().owedToMe})
										</button>
									</div>
									<details className={classes.secondaryFilters}>
										<summary>Members</summary>
										<div className={classes.memberFilters}>
											{houseMembers
												.filter((member) => member._id !== user._id) // Exclude current user
												.map((member) => (
													<button
														key={member._id}
														onClick={() => setSelectedFilter(member._id)}
														className={`${classes.memberFilter} ${selectedFilter === member._id ? classes.active : ""}`}
													>
														{member.name.split(" ")[0]}
													</button>
												))}
										</div>
									</details>
								</div>
							</div>
						</div>
						<div className={classes.mainExpensesList}>
							<div className={classes.expenseHeader}>
								<span className={classes.expensePayer}>Payer</span>
								<span className={classes.expenseName}>Expense Name</span>
								<span className={classes.expenseAmount}>Amount</span>
								<span className={classes.expenseDate}>Date</span>
								<span className={classes.expenseActions}>Actions</span>
								<span className={classes.expenseExpand}></span>
							</div>
							<div className={classes.list}>
								{displayedItems.length > 0 ? (
									<>
										{displayedItems.map((item) => (
											<div key={item._id} className={classes.expenseItem}>
												{/* Desktop Version */}
												<div
													className={`${classes.expenseRow} ${classes.desktopOnly}`}
													onClick={() => setExpandedItem(expandedItem === item._id ? null : item._id)}
												>
													<span className={classes.expensePayer}>
														<div className={classes.payerAvatar} title={getPayerName(item.author)}>
															{getPayerNickname(item.author)}
														</div>
													</span>
													<span className={classes.expenseName}>{item.name}</span>
													<span
														className={`${classes.expenseAmount} ${
															isUserOwedMoney(item) ? classes.owedAmount : classes.oweAmount
														}`}
													>
														${calculateUserShare(item).toFixed(2)}
														<sub>/${item.price.toFixed(2)}</sub>
													</span>
													<span className={classes.expenseDate}>{formatDateTime(item.createdAt)}</span>
													<span className={classes.expenseActions}>
														<button
															className={classes.edit}
															onClick={(e) => {
																e.stopPropagation();
																handleEdit(item);
															}}
															disabled={item.author !== user._id}
															style={{
																opacity: item.author !== user._id ? 0.5 : 1,
																cursor: item.author !== user._id ? "not-allowed" : "pointer",
															}}
														>
															<RiPencilFill className={classes.icon} />
														</button>
														<button
															className={classes.delete}
															onClick={(e) => {
																e.stopPropagation();
																handleDelete(item);
															}}
															disabled={item.author !== user._id}
															style={{
																opacity: item.author !== user._id ? 0.5 : 1,
																cursor: item.author !== user._id ? "not-allowed" : "pointer",
															}}
														>
															<RiDeleteBin6Line className={classes.icon} />
														</button>
													</span>
													<span className={classes.expenseExpand}>
														<span className={classes.expandIndicator}>{expandedItem === item._id ? "-" : "+"}</span>
													</span>
												</div>

												{/* Mobile Card Version */}
												<div
													className={`${classes.mobileCard} ${classes.mobileOnly}`}
													onClick={() => setExpandedItem(expandedItem === item._id ? null : item._id)}
												>
													<div className={classes.cardHeader}>
														<div className={classes.cardPayer}>
															<div className={classes.mobilePayerAvatar} title={getPayerName(item.author)}>
																{getPayerNickname(item.author)}
															</div>
															<div className={classes.payerInfo}>
																<span className={classes.payerName}>{getPayerName(item.author)}</span>
																<span className={classes.cardDate}>{formatDateTime(item.createdAt)}</span>
															</div>
														</div>
														<div className={classes.cardActions}>
															<button
																className={classes.mobileEdit}
																onClick={(e) => {
																	e.stopPropagation();
																	handleEdit(item);
																}}
																disabled={item.author !== user._id}
																style={{
																	opacity: item.author !== user._id ? 0.5 : 1,
																	cursor: item.author !== user._id ? "not-allowed" : "pointer",
																}}
															>
																<RiPencilFill />
															</button>
															<button
																className={classes.mobileDelete}
																onClick={(e) => {
																	e.stopPropagation();
																	handleDelete(item);
																}}
																disabled={item.author !== user._id}
																style={{
																	opacity: item.author !== user._id ? 0.5 : 1,
																	cursor: item.author !== user._id ? "not-allowed" : "pointer",
																}}
															>
																<RiDeleteBin6Line />
															</button>
														</div>
													</div>

													<div className={classes.cardBody}>
														<h3 className={classes.cardTitle}>{item.name}</h3>
														<div className={classes.cardAmountSection}>
															<div className={classes.cardAmountInfo}>
																<span className={classes.cardAmountLabel}>Your share</span>
																<span
																	className={`${classes.cardAmount} ${
																		isUserOwedMoney(item) ? classes.owedAmount : classes.oweAmount
																	}`}
																>
																	${calculateUserShare(item).toFixed(2)}
																</span>
															</div>
															<div className={classes.cardTotalInfo}>
																<span className={classes.cardTotalLabel}>Total</span>
																<span className={classes.cardTotal}>${item.price.toFixed(2)}</span>
															</div>
														</div>
													</div>

													<div className={classes.cardFooter}>
														<div className={classes.cardMembers}>
															{item.members.slice(0, 3).map((member, index) => (
																<div
																	key={index}
																	className={`${classes.cardMemberAvatar} ${
																		member.userID === user._id ? classes.currentUser : ""
																	}`}
																	title={getMemberName(member.userID)}
																>
																	{getMemberUsername(member.userID)}
																</div>
															))}
															{item.members.length > 3 && (
																<div className={classes.cardMemberCount}>+{item.members.length - 3}</div>
															)}
														</div>
														<div className={classes.cardExpandButton}>
															<span className={classes.mobileExpandIndicator}>
																{expandedItem === item._id ? "−" : "+"}
															</span>
														</div>
													</div>
												</div>
												{expandedItem === item._id && (
													<div className={classes.expandedContent}>
														<div className={classes.memberAvatars}>
															{item.members.map((member, index) => (
																<div
																	key={index}
																	className={`${classes.memberAvatar} ${
																		// Only show payment status colors if user is the author
																		item.author === user._id
																			? member.paid
																				? classes.paidMember
																				: classes.unpaidMember
																			: ""
																	} ${member.userID === user._id ? classes.currentUser : ""}`}
																	title={
																		item.author === user._id
																			? `${getMemberName(member.userID)} - ${member.paid ? "Paid" : "Unpaid"}`
																			: getMemberName(member.userID)
																	}
																>
																	{getMemberUsername(member.userID)}
																</div>
															))}
														</div>

														{/* Show detailed member info and progress only if user is the author */}
														{item.author === user._id && (
															<>
																<div className={classes.paymentProgressSection}>
																	<div className={classes.progressInfo}>
																		<span>
																			Payment Progress: {getPaymentProgress(item).paid}/{getPaymentProgress(item).total}
																		</span>
																		<div className={classes.paymentProgress}>
																			<div
																				className={classes.progressBar}
																				style={{
																					width: `${getPaymentProgress(item).percentage}%`,
																					backgroundColor:
																						getPaymentProgress(item).percentage === 100
																							? "var(--goodColor)"
																							: "var(--mainColor)",
																				}}
																			></div>
																		</div>
																	</div>
																</div>
																<div className={classes.detailedMemberList}>
																	{item.members.map((member, index) => (
																		<div key={index} className={classes.memberDetail}>
																			<div className={classes.memberInfo}>
																				<div
																					className={`${classes.memberAvatar} ${classes.small} ${
																						member.paid ? classes.paidMember : classes.unpaidMember
																					} ${member.userID === user._id ? classes.currentUser : ""}`}
																				>
																					{getMemberUsername(member.userID)}
																				</div>
																				<span className={classes.memberName}>
																					{getMemberName(member.userID)}
																					{member.userID === user._id && " (You)"}
																					{member.userID === item.author && " (Payer)"}
																				</span>
																			</div>
																			<div className={classes.memberStatus}>
																				{member.userID === item.author ? (
																					<span className={classes.payerBadge}>Payer</span>
																				) : member.paid ? (
																					<span className={classes.paidBadge}>✓ Paid</span>
																				) : (
																					<span className={classes.unpaidBadge}>Pending</span>
																				)}
																			</div>
																		</div>
																	))}
																</div>
															</>
														)}

														{/* Show pay section only if user is a member (not author) */}
														{item.author !== user._id && (
															<div className={classes.memberPaySection}>
																<div className={classes.paymentInfo}>
																	<div
																		className={`${classes.paymentDetail} ${
																			item.members.find((m) => m.userID === user._id)?.paid ? "paid" : ""
																		}`}
																	>
																		<span className={classes.paymentLabel}>Your share:</span>
																		<span className={classes.paymentAmount}>
																			${(item.price / item.members.length).toFixed(2)}
																		</span>
																	</div>
																	<div
																		className={`${classes.paymentStatus} ${
																			item.members.find((m) => m.userID === user._id)?.paid ? "paid" : "unpaid"
																		}`}
																	>
																		{item.members.find((m) => m.userID === user._id)?.paid ? "Paid" : "Unpaid"}
																	</div>
																</div>
																<button
																	className={classes.payButton}
																	onClick={() => handlePayment(item._id)}
																	disabled={item.members.find((m) => m.userID === user._id)?.paid}
																>
																	{item.members.find((m) => m.userID === user._id)?.paid ? "✓ Paid" : "Mark as Paid"}
																</button>
															</div>
														)}
													</div>
												)}
											</div>
										))}
										{/* Show More Button */}
										{hasMoreItems && (
											<div className={classes.showMoreContainer}>
												<button onClick={loadMoreItems} className={classes.showMoreButton}>
													Show More ({filteredItems.length - displayedItems.length} remaining)
												</button>
											</div>
										)}
									</>
								) : (
									<p style={{ textAlign: "center", padding: "2rem", color: "#fff" }}>No expenses found</p>
								)}
							</div>
						</div>
					</div>
					<div className={classes.mainStatistics}>
						<div className={classes.statisticsHeader}>
							<h2>Payment Overview</h2>
						</div>
						<div className={classes.statisticsContent}>
							<div style={{ padding: "1rem", color: "#fff" }}>
								<div className={classes.paymentStats}>
									<div className={classes.statItem}>
										<span className={classes.statLabel}>Total Monthly Spending:</span>
										<span className={classes.statPrice}>
											${getPaymentOverviewStats().totalMonthlySpending.toFixed(2)}
										</span>
									</div>
									<div className={classes.statItem}>
										<span className={classes.statLabel}>Total Monthly Share:</span>
										<span className={classes.statPrice}>${getPaymentOverviewStats().totalMonthlyShare.toFixed(2)}</span>
									</div>
									<div className={classes.statItem}>
										<span className={classes.statLabel}>Average Expense:</span>
										<span className={classes.statPrice}>${getPaymentOverviewStats().averageExpense.toFixed(2)}</span>
									</div>
									<div className={classes.statItem}>
										<span className={classes.statLabel}>Most Expensive Item:</span>
										<span className={classes.statPrice}>
											${getPaymentOverviewStats().mostExpensiveAmount.toFixed(2)}
										</span>
									</div>
									<div className={classes.statItem}>
										<span className={classes.statLabel}>Most Active Payer:</span>
										<span className={classes.statPrice}>{getPaymentOverviewStats().mostActivePayer}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
			{showAddItem && <AddItem setAddItem={setShowAddItem} itemToEdit={itemToEdit} />}
			{deleteConfirmation && (
				<DeleteConfirmation
					setDeleteConfirmation={setDeleteConfirmation}
					itemToDelete={itemToDelete}
					onItemDeleted={fetchItems} // Refresh items after deletion
				/>
			)}
		</div>
	);
};

export default Expenses;
