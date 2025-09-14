import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./Expenses.module.css";
import { RiDeleteBin6Line } from "react-icons/ri";
import { RiPencilFill } from "react-icons/ri";
import { RiSearchLine } from "react-icons/ri";
import { FaDollarSign, FaHistory, FaArrowUp, FaArrowDown, FaUser, FaExternalLinkAlt } from "react-icons/fa";
import { useUser } from "../../hooks/useUser";
import { useDataLoading } from "../../hooks/useLoading";
import { ExpensesSkeleton } from "../../components/Skeleton";
import formatDateTime from "../../utils/formatDateTime";
import AddItem from "../../components/AddItem/AddItem";
import DeleteConfirmation from "../../pages/Expenses/components/DeleteConfirmation/DeleteConfirmation";
import RefreshButton from "../../components/RefreshButton";
import AddItemButton from "../../components/AddItemButton/AddItemButton";
import Tooltip from "../../components/Tooltip";
import axios from "axios";
import ably from "../../ablyConfig";

const Expenses = () => {
	useEffect(() => {
		document.title = "Expenses - HouseCash";
	}, []);

	const navigate = useNavigate();
	const { user, houseMembers, items, fetchItems, deleteItem, fetchCurrentUser } = useUser();
	const memberFiltersRef = useRef(null); // Ref to control the details element
	// derived in applyFilters and directly rendered
	const [selectedFilter, setSelectedFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [showAddItem, setShowAddItem] = useState(false);
	const [itemToEdit, setItemToEdit] = useState(null);
	const [deleteConfirmation, setDeleteConfirmation] = useState(false);
	const [itemToDelete, setItemToDelete] = useState(null);
	const [selectedItem, setSelectedItem] = useState(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Close modal handler
	const closeModal = () => {
		setSelectedItem(null);
	}; // Changed from expandedItem to selectedItem for modal

	// Refresh function
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			// Refresh user data and house members
			await fetchCurrentUser();
			// Refresh items
			await fetchItems();
		} catch (error) {
			console.error("Error refreshing expenses data:", error);
		} finally {
			setIsRefreshing(false);
		}
	}, [fetchCurrentUser, fetchItems]);
	// Displayed list state (show all by default)
	const [displayedItems, setDisplayedItems] = useState([]);

	// Comprehensive loading check - wait for all data to be processed
	const dataReady =
		user && houseMembers && houseMembers.length > 0 && items !== null && items !== undefined && displayedItems !== null;

	const isLoading = useDataLoading(dataReady);

	useEffect(() => {
		// Items will be automatically fetched by useUser hook when user data is available
	}, []);

	// Ably connection and event handling for real-time updates
	useEffect(() => {
		if (!user?.houseCode) return;

		// Subscribe to house channel for real-time updates
		const channel = ably.channels.get(`house:${user.houseCode}`);

		// Listen for fetch updates
		const fetchUpdateHandler = () => {
			console.log("Received fetchUpdate event from Ably in Expenses");
			fetchItems();
		};

		// Listen for item updates
		const itemUpdateHandler = (message) => {
			console.log("Received itemUpdate event from Ably in Expenses:", message.data);
			fetchItems();
		};

		// Listen for payment notifications
		const paymentNotificationHandler = (message) => {
			console.log("Received paymentNotification event from Ably in Expenses:", message.data);
			fetchItems();
		};

		// Subscribe to events
		channel.subscribe("fetchUpdate", fetchUpdateHandler);
		channel.subscribe("itemUpdate", itemUpdateHandler);
		channel.subscribe("paymentNotification", paymentNotificationHandler);

		// Cleanup on unmount
		return () => {
			channel.unsubscribe("fetchUpdate", fetchUpdateHandler);
			channel.unsubscribe("itemUpdate", itemUpdateHandler);
			channel.unsubscribe("paymentNotification", paymentNotificationHandler);
		};
	}, [fetchItems, user?.houseCode]);

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
			setDisplayedItems([]);
			return;
		}

		// First, filter to only show items where user is involved (either as author or member)
		let filtered = items.filter(
			(item) => item.author === user._id || item.members.some((member) => member.userID === user._id)
		);

		// Apply primary filter to the already filtered set
		switch (selectedFilter) {
			case "all":
				// Already filtered to user's items above - show all items user is involved in
				break;
			case "my-expenses":
				filtered = filtered.filter((item) => item.author === user._id);
				break;
			case "i-owe":
				filtered = filtered.filter((item) => {
					const userMember = item.members.find((member) => member.userID === user._id);
					return userMember && !userMember.paid && item.author !== user._id;
				});
				break;
			case "owed-to-me":
				filtered = filtered.filter((item) => {
					if (item.author !== user._id) return false;
					return item.members.some((member) => member.userID !== user._id && !member.paid);
				});
				break;
			default:
				// Individual member filter - filter by payer only
				filtered = filtered.filter((item) => item.author === selectedFilter);
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

		// Show all filtered items by default (avoid pagination hiding older items)
		setDisplayedItems(filtered);
	};

	// No pagination when showing all

	useEffect(() => {
		applyFilters();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items, selectedFilter, searchQuery, user?._id]);

	// Count functions for filter badges
	const getFilterCounts = () => {
		if (!user?._id) return { myExpenses: 0, iOwe: 0, owedToMe: 0, allUserItems: 0 };

		// Only count items where user is involved (either as author or member)
		const userItems = items.filter(
			(item) => item.author === user._id || item.members.some((member) => member.userID === user._id)
		);

		const myExpenses = userItems.filter((item) => item.author === user._id).length;
		const iOwe = userItems.filter((item) => {
			const userMember = item.members.find((member) => member.userID === user._id);
			return userMember && !userMember.paid && item.author !== user._id;
		}).length;
		const owedToMe = userItems.filter((item) => {
			if (item.author !== user._id) return false;
			return item.members.some((member) => member.userID !== user._id && !member.paid);
		}).length;

		return { myExpenses, iOwe, owedToMe, allUserItems: userItems.length };
	};

	const handleEdit = (item) => {
		setItemToEdit(item);
		setShowAddItem(true);
	};

	const handleDelete = (item) => {
		setItemToDelete(item);
		setDeleteConfirmation(true);
	};

	const handleMemberFilterSelect = (memberId) => {
		setSelectedFilter(memberId);
		// Close the details panel
		if (memberFiltersRef.current) {
			memberFiltersRef.current.open = false;
		}
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

				// The server will handle Ably notifications via AblyService
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
					{/* Stats Grid */}
					<div className={classes.statsGrid}>
						<div className={classes.statCard}>
							<div className={classes.statIcon}>
								<FaDollarSign />
							</div>
							<div className={classes.statNumber}>${getPaymentOverviewStats().totalMonthlySpending.toFixed(2)}</div>
							<div className={classes.statLabel}>Total Monthly Spending</div>
						</div>
						<div className={classes.statCard}>
							<div className={classes.statIcon}>
								<FaArrowDown />
							</div>
							<div className={classes.statNumber}>${getPaymentOverviewStats().totalMonthlyShare.toFixed(2)}</div>
							<div className={classes.statLabel}>Total Monthly Share</div>
						</div>
						<div className={classes.statCard}>
							<div className={classes.statIcon}>
								<FaHistory />
							</div>
							<div className={classes.statNumber}>${getPaymentOverviewStats().averageExpense.toFixed(2)}</div>
							<div className={classes.statLabel}>Average Expense</div>
						</div>
						<div className={classes.statCard}>
							<div className={classes.statIcon}>
								<FaArrowUp />
							</div>
							<div className={classes.statNumber}>${getPaymentOverviewStats().mostExpensiveAmount.toFixed(2)}</div>
							<div className={classes.statLabel}>Most Expensive Item</div>
						</div>
						<div className={classes.statCard}>
							<div className={classes.statIcon}>
								<FaUser />
							</div>
							<div className={classes.statNumber}>{getPaymentOverviewStats().mostActivePayer}</div>
							<div className={classes.statLabel}>Most Active Payer</div>
						</div>
					</div>

					{/* Main Expenses Section */}
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
											All ({getFilterCounts().allUserItems})
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
										<div className={classes.memberFilterContainer}>
											<select
												className={classes.memberDropdown}
												value={["all", "my-expenses", "i-owe", "owed-to-me"].includes(selectedFilter) ? "" : selectedFilter}
												onChange={(e) => setSelectedFilter(e.target.value || "all")}
											>
												<option value="">Filter by member</option>
												{houseMembers?.map((member) => (
													<option key={member._id} value={member._id}>
														{member.name.split(" ")[0]}
													</option>
												))}
											</select>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className={classes.mainExpensesList}>
							<div className={classes.expenseHeader}>
								<span className={classes.expensePayer}>Payer</span>
								<span className={classes.expenseName}>Expense Name</span>
								<span className={classes.expenseAmount}>Amount</span>
								<span className={classes.expenseDate}>Date</span>
								<span className={classes.expenseMembers}>Members</span>
								<span className={classes.expenseActions}>Actions</span>
								<span className={classes.expenseStatus}>Status</span>
							</div>
							<div className={classes.list}>
								{displayedItems.length > 0 ? (
									<>
										{displayedItems.map((item) => (
											<div
												key={item._id}
												className={`${classes.expenseItem} ${
													item.author !== user._id
														? (item.members.find((m) => m.userID === user._id)?.paid ? classes.paid : classes.unpaid)
														: ""
												}`}
											>
												{/* Desktop Version */}
												<div
													className={`${classes.expenseRow} ${classes.desktopOnly} ${item.author !== user._id ? classes.notAuthor : ""}`}
													onClick={() => setSelectedItem(item)}
												>
													<span className={classes.expensePayer}>
														<Tooltip content={getPayerName(item.author)} position="top">
															<div className={classes.payerAvatar}>
																{getPayerNickname(item.author)}
															</div>
														</Tooltip>
													</span>
													<span className={classes.expenseName}>{item.name}</span>
													<span
														className={`${classes.expenseAmount} ${
															isUserOwedMoney(item) ? classes.owedAmount : classes.oweAmount
														}`}
													>
														${calculateUserShare(item).toFixed(2)}
														<sub>/{item.price.toFixed(2)}</sub>
													</span>
													<span className={classes.expenseDate}>{formatDateTime(item.createdAt)}</span>
													<span className={classes.expenseMembers}>
														<div className={classes.memberCount}>
															{item.members.length} {item.members.length === 1 ? "member" : "members"}
														</div>
													</span>
													<span className={classes.expenseActions}>
														{item.author === user._id && (() => {
															// Check if any member (excluding the author) has paid
															const otherMembersPaid = Array.isArray(item.members) && item.members.some((m) => m.paid && m.userID !== user._id);
															const disabled = !!otherMembersPaid;
															const style = { opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" };
															return (
																<>
																	<button
																		className={classes.edit}
																		onClick={(e) => {
																			e.stopPropagation();
																			if (disabled) return;
																			handleEdit(item);
																		}}
																		disabled={disabled}
																		style={style}
																	>
																		<RiPencilFill className={classes.icon} />
																	</button>
																	<button
																		className={classes.delete}
																		onClick={(e) => {
																			e.stopPropagation();
																			if (disabled) return;
																			handleDelete(item);
																		}}
																		disabled={disabled}
																		style={style}
																	>
																		<RiDeleteBin6Line className={classes.icon} />
																	</button>
																</>
															);
														})()}
													</span>
													<span className={classes.expenseStatus}>
														{item.author === user._id && (() => {
															const allPaid = item.members.every(member => member.paid);
															return allPaid ? (
																<div className={`${classes.statusText} ${classes.paid}`}>
																	All Paid
																</div>
															) : (
																<div className={`${classes.statusText} ${classes.pending}`}>
																	Pending
																</div>
															);
														})()}
													</span>
												</div>

												{/* Mobile Card Version */}
												<div
													className={`${classes.mobileCard} ${classes.mobileOnly} ${
														item.author !== user._id
															? (item.members.find((m) => m.userID === user._id)?.paid ? classes.paid : classes.unpaid)
															: ""
													}`}
													onClick={() => setSelectedItem(item)}
												>
													<div className={classes.cardHeader}>
														<div className={classes.cardPayer}>
															<Tooltip content={getPayerName(item.author)} position="top">
																<div className={classes.mobilePayerAvatar}>
																	{getPayerNickname(item.author)}
																</div>
															</Tooltip>
															<div className={classes.payerInfo}>
																<span className={classes.payerName}>{getPayerName(item.author)}</span>
																<span className={classes.cardDate}>{formatDateTime(item.createdAt)}</span>
															</div>
														</div>
														<div className={classes.cardHeaderRight}>
															{item.author === user._id && (() => {
																const allPaid = item.members.every(member => member.paid);
																return (
																	<div className={`${classes.mobileStatusText} ${allPaid ? classes.paid : classes.pending}`}>
																		{allPaid ? "All Paid" : "Pending"}
																	</div>
																);
															})()}
															<div className={classes.cardActions}>
															{item.author === user._id && (() => {
																// Check if any member (excluding the author) has paid
																const otherMembersPaid = Array.isArray(item.members) && item.members.some((m) => m.paid && m.userID !== user._id);
																const disabled = !!otherMembersPaid;
																const style = { opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" };
																return (
																<>
																	<button
																		className={classes.mobileEdit}
																		onClick={(e) => {
																			e.stopPropagation();
																			if (disabled) return;
																			handleEdit(item);
																		}}
																		disabled={disabled}
																		style={style}
																	>
																		<RiPencilFill />
																	</button>
																	<button
																		className={classes.mobileDelete}
																		onClick={(e) => {
																			e.stopPropagation();
																			if (disabled) return;
																			handleDelete(item);
																		}}
																		disabled={disabled}
																		style={style}
																	>
																		<RiDeleteBin6Line />
																	</button>
																</>
																);
															})()}
															</div>
														</div>
													</div>

													<div className={classes.cardBody}>
														<h3 className={classes.cardTitle}>{item.name}</h3>
														<div className={classes.cardAmountSection}>
															<div className={classes.cardAmountInfo}>
																<span className={classes.cardAmountLabel}>
																	{isUserOwedMoney(item) && item.members.length > 1
																		? "You receive (per person)"
																		: isUserOwedMoney(item)
																		? "You receive"
																		: "Your share"}
																</span>
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
																<Tooltip content={getMemberName(member.userID)} position="top" key={index}>
																	<div
																		className={`${classes.cardMemberAvatar} ${
																			member.userID === user._id ? classes.currentUser : ""
																		}`}
																	>
																		{getMemberUsername(member.userID)}
																	</div>
																</Tooltip>
															))}
															{item.members.length > 3 && (
																<div className={classes.cardMemberCount}>+{item.members.length - 3}</div>
															)}
														</div>
														<div className={classes.cardMemberInfo}>
															<span className={classes.mobileMemberCount}>
																{item.members.length} {item.members.length === 1 ? "member" : "members"}
															</span>
														</div>
													</div>
												</div>
											</div>
										))}
										{/* No pagination; showing all items */}
									</>
								) : (
									<p style={{ textAlign: "center", padding: "2rem", color: "#fff" }}>No expenses found</p>
								)}
							</div>
						</div>
					</div>
				</>
			)}

			{/* Expense Details Modal */}
			{selectedItem && (
				<div className={classes.modalOverlay} onClick={closeModal}>
					{(() => {
						const me = selectedItem.members.find((m) => m.userID === user._id);
						const paid = me?.paid;
						const isAuthor = selectedItem.author === user._id;
						const notAuthor = !isAuthor;
						
						// Color logic: Author = primary color, Paid = green, Unpaid = red
						let modalClass = classes.modal;
						if (isAuthor) {
							modalClass += ` ${classes.authorModal}`;
						} else if (paid) {
							modalClass += ` ${classes.paid}`;
						} else {
							modalClass += ` ${classes.unpaid}`;
						}
						
						return (
							<div className={modalClass} onClick={(e) => e.stopPropagation()}>
								<div className={classes.modalHeader}>
									<h3>{selectedItem.name}</h3>
									<button className={classes.modalClose} onClick={closeModal}>&times;</button>
								</div>
								<div className={classes.modalContent}>
									<div className={classes.expenseDetails}>
										<div className={classes.expenseInfo}>
											<p>
												<strong>Total:</strong> ${selectedItem.price.toFixed(2)}
											</p>
											<p>
												<strong>Share per person:</strong> ${(selectedItem.price / selectedItem.members.length).toFixed(2)}
											</p>
											<p>
												<strong>Date:</strong> {formatDateTime(selectedItem.createdAt)}
											</p>
										</div>

										<div className={classes.memberAvatars}>
											{selectedItem.members.map((member, index) => {
												const isMe = member.userID === user._id;
												const isAuthor = selectedItem.author === user._id;
												const isPayer = member.userID === selectedItem.author;
												
												// Always show all members in the modal
												
												let avatarClass = classes.memberAvatar;
												
												if (isAuthor) {
													// I'm the author - show all members with their payment status
													if (isMe) {
														// I'm the author - show me in primary color
														avatarClass += ` ${classes.authorMember}`;
													} else {
														// Other members - show their payment status
														avatarClass += member.paid ? ` ${classes.paidMember}` : ` ${classes.unpaidMember}`;
													}
												} else {
													// I'm just a member - show privacy-respecting view
													if (isMe) {
														// Show my payment status
														avatarClass += member.paid ? ` ${classes.paidMember}` : ` ${classes.unpaidMember}`;
													} else {
														// Other members - neutral color (privacy)
														avatarClass += ` ${classes.neutralMember}`;
													}
												}
												
												return (
													<Tooltip content={`${getMemberName(member.userID)}${isPayer ? " (Payer)" : ""}`} position="top" key={index}>
														<div className={avatarClass}>
															{getMemberUsername(member.userID)}
														</div>
													</Tooltip>
												);
											})}
										</div>
										
										{/* Payment Note - Show below avatars if user didn't pay */}
										{selectedItem.author !== user._id && (() => {
											const me = selectedItem.members.find(m => m.userID === user._id);
											return me && !me.paid ? (
												<div 
													className={classes.paymentNote}
													onClick={() => navigate('/dashboard')}
													role="button"
													tabIndex={0}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															navigate('/dashboard');
														}
													}}
												>
													Go pay in Dashboard
													<FaExternalLinkAlt className={classes.paymentNoteIcon} />
												</div>
											) : null;
										})()}
									</div>
								</div>
							</div>
						);
					})()}
				</div>
			)}

			{showAddItem && <AddItem setAddItem={setShowAddItem} itemToEdit={itemToEdit} />}
			{deleteConfirmation && (
				<DeleteConfirmation
					setDeleteConfirmation={setDeleteConfirmation}
					itemToDelete={itemToDelete}
					onItemDeleted={fetchItems} // Refresh items after deletion
					deleteItem={deleteItem} // Pass the deleteItem function from useUser hook
				/>
			)}
			
			{/* Floating Action Buttons */}
			<div className={classes.floatingActionButtons}>
				<div className={classes.mobileOnly}>
					<AddItemButton />
				</div>
				<RefreshButton 
					onRefresh={handleRefresh} 
					loading={isRefreshing}
					size="small"
				/>
			</div>
		</div>
	);
};

export default Expenses;