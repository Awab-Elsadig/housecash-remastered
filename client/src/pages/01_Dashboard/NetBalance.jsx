import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaHandHoldingUsd, FaExchangeAlt } from "react-icons/fa";
import { PiHandDepositFill } from "react-icons/pi";
import classes from "./NetBalance.module.css";
import axios from "axios";
import { useSettlement } from "../../contexts/SettlementContext";

const NetBalance = ({ user, houseMembers, items, onDataRefresh = () => {} }) => {
	const [balances, setBalances] = useState({});
	const [allMemberBalances, setAllMemberBalances] = useState({}); // Store all balances including zero ones

	// Use global settlement context
	const { settlementRequests, isProcessing, setIsProcessing, sendSettlementRequest, clearSettlementRequest } =
		useSettlement();

	// Use refs to store current balance data for event handlers
	const balancesRef = useRef({});
	const allMemberBalancesRef = useRef({});

	// ...existing code...
	useEffect(() => {
		if (!user?._id || !items.length || !houseMembers.length) return;

		const memberBalances = {};

		// Initialize balances for all house members
		houseMembers.forEach((member) => {
			if (member._id !== user._id) {
				console.log("Initializing balance for member:", member._id, member.name);
				memberBalances[member._id] = {
					memberInfo: member,
					owed: 0, // Money they owe you (you should collect)
					owing: 0, // Money you owe them (you should pay)
					net: 0, // Net balance (positive = they owe you, negative = you owe them)
					items: {
						owedItems: [], // Items where they owe you
						owingItems: [], // Items where you owe them
					},
				};
			}
		});

		// Calculate balances from items
		items.forEach((item) => {
			const share = item.price / item.members.length;
			const isYourItem = item.author.toString() === user._id.toString();

			if (isYourItem) {
				// For items you authored - calculate what others owe you
				item.members.forEach((member) => {
					if (member.userID !== user._id && !member.paid && !member.got) {
						const memberId = member.userID;
						if (memberBalances[memberId]) {
							memberBalances[memberId].owed += share;
							memberBalances[memberId].items.owedItems.push({
								...item,
								share,
								memberStatus: member,
							});
						}
					}
				});
			} else {
				// For items others authored - calculate what you owe them
				const userMember = item.members.find((m) => m.userID === user._id);
				const authorId = item.author.toString();

				if (userMember && !userMember.paid && memberBalances[authorId]) {
					memberBalances[authorId].owing += share;
					memberBalances[authorId].items.owingItems.push({
						...item,
						share,
						memberStatus: userMember,
					});
				}
			}
		});

		// Calculate net balances
		Object.keys(memberBalances).forEach((memberId) => {
			const balance = memberBalances[memberId];
			balance.net = balance.owed - balance.owing;
		});

		console.log("Final memberBalances after calculation:", Object.keys(memberBalances));
		console.log("Member balances details:", memberBalances);

		// Filter out members with zero balances for display
		const activeBalances = Object.keys(memberBalances)
			.filter((memberId) => {
				const balance = memberBalances[memberId];
				const hasBalance = balance.owed > 0 || balance.owing > 0;
				console.log(
					`Member ${memberId} (${balance.memberInfo.name}): owed=${balance.owed}, owing=${balance.owing}, hasBalance=${hasBalance}`
				);
				return hasBalance;
			})
			.reduce((acc, memberId) => {
				acc[memberId] = memberBalances[memberId];
				return acc;
			}, {});

		console.log("Active balances after filtering:", Object.keys(activeBalances));

		// Store all member balances (including zero balances) for settlement processing
		setAllMemberBalances(memberBalances);
		setBalances(activeBalances);

		// Update refs for event handlers to access current data
		balancesRef.current = activeBalances;
		allMemberBalancesRef.current = memberBalances;
	}, [user, items, houseMembers]);

	// Process the actual settlement - SIMPLIFIED VERSION
	const processSettlement = useCallback(
		async (memberId) => {
			console.log("processSettlement called with memberId:", memberId);

			// Get balance data - if not found, create a basic member info
			let balance =
				balances[memberId] ||
				allMemberBalances[memberId] ||
				balancesRef.current[memberId] ||
				allMemberBalancesRef.current[memberId];

			// If we still can't find balance, create a basic one from houseMembers
			if (!balance) {
				const member = houseMembers.find((m) => m._id === memberId);
				if (!member) {
					console.error("Member not found in houseMembers:", memberId);
					alert("Settlement failed - member not found.");
					return;
				}

				balance = {
					memberInfo: member,
					owed: 0,
					owing: 0,
					net: 0,
					items: { owedItems: [], owingItems: [] },
				};
			}

			console.log("Processing settlement for balance:", balance);
			setIsProcessing((prev) => ({ ...prev, [memberId]: true }));

			try {
				// Batch process all items in a single call to avoid multiple API requests
				const allItemsToResolve = [
					// Items where they owe you
					...balance.items.owedItems.map((item) => ({
						id: item._id,
						name: item.name,
						share: item.share,
						type: "owed",
						direction: "paying",
						senderId: memberId,
						recipientId: user._id,
					})),
					// Items where you owe them
					...balance.items.owingItems.map((item) => ({
						id: item._id,
						name: item.name,
						share: item.share,
						type: "owing",
						direction: "paying",
						senderId: user._id,
						recipientId: memberId,
					})),
				];

				// Process all items in a single batch call
				if (allItemsToResolve.length > 0) {
					await axios.patch(
						"/api/items/resolve-balance-batch",
						{
							items: allItemsToResolve,
						},
						{
							withCredentials: true,
						}
					);
				}

				// Create settlement transaction record with proper item categorization
				const settlementData = {
					settlementWithId: memberId,
					settlementWithName: balance.memberInfo.name,
					amount: Math.abs(balance.net || 0), // Always positive amount
					netAmount: balance.net, // Keep the signed net amount
					items: [
						// Items where they owe you (you should collect) - marked as "owed"
						...balance.items.owedItems.map((item) => ({
							id: item._id,
							name: item.name,
							share: item.share,
							itemType: "owed",
						})),
						// Items where you owe them (you should pay) - marked as "owing"
						...balance.items.owingItems.map((item) => ({
							id: item._id,
							name: item.name,
							share: item.share,
							itemType: "owing",
						})),
					],
					notes: `Settlement with ${balance.memberInfo.name}`,
				};

				await axios.post("/api/payment-transactions/create-settlement", settlementData, {
					withCredentials: true,
				});

				console.log("Settlement transaction created successfully");

				// Clear settlement requests and processing state
				clearSettlementRequest(memberId);

				// Optimistically update balances by removing the settled member
				setBalances((prev) => {
					const updated = { ...prev };
					delete updated[memberId];
					return updated;
				});

				// Refresh data
				if (onDataRefresh) {
					onDataRefresh();
				}
			} catch (error) {
				console.error("Error processing settlement:", error);
				const errorMessage = error.response?.data?.message || error.message || "Unknown error";
				alert(`Settlement failed: ${errorMessage}`);
				throw error;
			} finally {
				setIsProcessing((prev) => ({ ...prev, [memberId]: false }));
			}
		},
		[balances, allMemberBalances, user._id, onDataRefresh, houseMembers, clearSettlementRequest, setIsProcessing]
	);

	// Listen for custom settlement accepted events from the global context
	useEffect(() => {
		const handleSettlementAccepted = (event) => {
			const { senderId } = event.detail;
			console.log("Processing settlement for accepted request:", senderId);
			processSettlement(senderId);
		};

		window.addEventListener("settlementAccepted", handleSettlementAccepted);
		return () => window.removeEventListener("settlementAccepted", handleSettlementAccepted);
	}, [processSettlement]); // Calculate net balances for all members

	// Wrapper function to send settlement request with proper data
	const handleSendSettlementRequest = useCallback(
		async (memberId) => {
			const balance = balances[memberId];
			if (!balance || isProcessing[memberId]) return;

			const success = await sendSettlementRequest(memberId, balance.memberInfo.name, balance.net);

			if (!success) {
				alert("Failed to send settlement request. Please try again.");
			}
		},
		[balances, isProcessing, sendSettlementRequest]
	);

	return (
		<div className={classes.netBalance}>
			<h3 className={classes.title}>
				<FaExchangeAlt className={classes.titleIcon} />
				Net Balance
			</h3>

			{/* Member Balances */}
			<div className={classes.balancesSection}>
				{Object.keys(balances).length > 0 ? (
					Object.entries(balances).map(([memberId, balance]) => {
						const netAmount = balance.net;
						const isPositive = netAmount > 0;

						return (
							<div key={memberId} className={classes.memberBalance}>
								<div className={classes.memberHeader}>
									<h4 className={classes.memberName}>{balance.memberInfo.name.split(" ")[0]}</h4>
									<div className={classes.netAmount}>
										<span className={`${classes.netValue} ${isPositive ? classes.positive : classes.negative}`}>
											{isPositive ? "+" : ""}${netAmount.toFixed(2)}
										</span>
									</div>
								</div>

								<div className={classes.balanceDetails}>
									{balance.owed > 0 && (
										<div className={classes.balanceRow}>
											<span className={classes.balanceLabel}>
												<FaHandHoldingUsd className={classes.balanceIcon} />
												Settlement:
											</span>
											<span className={`${classes.owedAmount} ${classes.positive}`}>${balance.owed.toFixed(2)}</span>
										</div>
									)}

									{balance.owing > 0 && (
										<div className={classes.balanceRow}>
											<span className={classes.balanceLabel}>
												<PiHandDepositFill className={classes.balanceIcon} />
												Settlement:
											</span>
											<span className={`${classes.owingAmount} ${classes.negative}`}>${balance.owing.toFixed(2)}</span>
										</div>
									)}
								</div>

								{/* Settlement button or status */}
								<div className={classes.actionSection}>
									{/* Show waiting state if we sent a request to this user */}
									{settlementRequests[memberId]?.type === "outgoing" ? (
										<div className={classes.pendingRequest}>
											<span>
												Awaiting confirmation from {balance.memberInfo.name.split(" ")[0]}...
												{settlementRequests[memberId].expiresAt && (
													<div className={classes.timeLeft}>
														Expires in{" "}
														{Math.max(0, Math.ceil((settlementRequests[memberId].expiresAt - Date.now()) / 1000))}s
													</div>
												)}
											</span>
										</div>
									) : (
										/* Normal settle button */
										<button
											onClick={() => handleSendSettlementRequest(memberId)}
											className={classes.resolveBtn}
											disabled={isProcessing[memberId]}
										>
											<FaExchangeAlt className={classes.resolveIcon} />
											{isProcessing[memberId] ? "Processing..." : `Settle Up $${netAmount.toFixed(2)}`}
										</button>
									)}
								</div>
							</div>
						);
					})
				) : (
					<div className={classes.noBalances}>
						<p>All settled up! 🎉</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default NetBalance;
