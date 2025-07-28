import React, { useState, useEffect } from "react";
import { FaHandHoldingUsd, FaExchangeAlt, FaCheck, FaTimes, FaClock } from "react-icons/fa";
import { PiHandDepositFill } from "react-icons/pi";
import classes from "./NetBalance.module.css";
import axios from "axios";
import ably from "../../ablyConfig";

const NetBalanceAbly = ({ user, houseMembers, items }) => {
	const [balances, setBalances] = useState({});
	const [pendingResolutions, setPendingResolutions] = useState({});
	const [incomingResolutions, setIncomingResolutions] = useState({});
	const [currentTime, setCurrentTime] = useState(Date.now());
	const [channel, setChannel] = useState(null);

	// Load pending and incoming resolutions from localStorage on component mount
	useEffect(() => {
		if (!user?._id) return;

		const storageKey = `resolutions_${user._id}`;
		const stored = localStorage.getItem(storageKey);

		if (stored) {
			try {
				const { pending = {}, incoming = {} } = JSON.parse(stored);
				const now = Date.now();

				// Filter out expired resolutions
				const validPending = Object.fromEntries(
					Object.entries(pending).filter(([, resolution]) => resolution.expiresAt > now)
				);
				const validIncoming = Object.fromEntries(
					Object.entries(incoming).filter(([, resolution]) => resolution.expiresAt > now)
				);

				setPendingResolutions(validPending);
				setIncomingResolutions(validIncoming);
			} catch (error) {
				console.error("Error loading resolutions from localStorage:", error);
			}
		}
	}, [user?._id]);

	// Save resolutions to localStorage whenever they change
	useEffect(() => {
		if (!user?._id) return;

		const storageKey = `resolutions_${user._id}`;
		const dataToStore = {
			pending: pendingResolutions,
			incoming: incomingResolutions,
		};

		localStorage.setItem(storageKey, JSON.stringify(dataToStore));
	}, [pendingResolutions, incomingResolutions, user?._id]);

	// Calculate net balances for all members
	useEffect(() => {
		if (!user?._id || !items.length || !houseMembers.length) return;

		const memberBalances = {};

		// Initialize balances for all house members
		houseMembers.forEach((member) => {
			if (member._id !== user._id) {
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

		// Filter out members with zero balances
		const activeBalances = Object.keys(memberBalances)
			.filter((memberId) => {
				const balance = memberBalances[memberId];
				return balance.owed > 0 || balance.owing > 0;
			})
			.reduce((acc, memberId) => {
				acc[memberId] = memberBalances[memberId];
				return acc;
			}, {});

		setBalances(activeBalances);
	}, [user, items, houseMembers]);

	// Helper function to clean up expired resolutions
	const cleanupExpiredResolutions = () => {
		const now = Date.now();

		setPendingResolutions((prev) => {
			const filtered = Object.fromEntries(Object.entries(prev).filter(([, resolution]) => resolution.expiresAt > now));
			return Object.keys(filtered).length !== Object.keys(prev).length ? filtered : prev;
		});

		setIncomingResolutions((prev) => {
			const filtered = Object.fromEntries(Object.entries(prev).filter(([, resolution]) => resolution.expiresAt > now));
			return Object.keys(filtered).length !== Object.keys(prev).length ? filtered : prev;
		});
	};

	// Timer effect to update current time every second and cleanup expired resolutions
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(Date.now());
			cleanupExpiredResolutions(); // Clean up expired resolutions every second
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	// Setup Ably channels and listeners
	useEffect(() => {
		if (!user?._id) return;

		// Create channel for this user's house
		const houseChannel = ably.channels.get(`house:${user.houseCode}`);
		setChannel(houseChannel);

		// Listen for incoming resolution requests
		const handleResolutionRequest = (message) => {
			const data = message.data;
			if (data.recipientId === user._id) {
				setIncomingResolutions((prev) => ({
					...prev,
					[data.senderId]: {
						...data,
						expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
					},
				}));

				// Auto-remove after 10 minutes
				setTimeout(() => {
					setIncomingResolutions((prev) => {
						const newState = { ...prev };
						delete newState[data.senderId];
						return newState;
					});
				}, 10 * 60 * 1000);
			}
		};

		// Listen for resolution responses
		const handleResolutionResponse = (message) => {
			const data = message.data;
			if (data.senderId === user._id) {
				setPendingResolutions((prev) => {
					const newState = { ...prev };
					delete newState[data.recipientId];
					return newState;
				});

				if (data.accepted) {
					console.log("Settlement accepted - data should refresh automatically via Ably");
					// Data will refresh via fetchUpdate event or parent component re-render
				}
			}
		};

		// Subscribe to events
		houseChannel.subscribe("resolutionRequest", handleResolutionRequest);
		houseChannel.subscribe("resolutionResponse", handleResolutionResponse);
		houseChannel.subscribe("fetchUpdate", () => {
			console.log("Fetch update received - data should refresh via parent component");
			// Parent component should handle data refetching via Ably
		});

		// Cleanup
		return () => {
			houseChannel.unsubscribe();
		};
	}, [user?._id, user?.houseCode]);

	const handleResolveBalance = async (memberId) => {
		const balance = balances[memberId];
		if (!balance || !channel) return;

		try {
			// For settlement, we always include ALL items (both owed and owing)
			const allSettlementItems = [
				...balance.items.owedItems.map((item) => ({
					id: item._id,
					name: item.name,
					share: item.share,
					type: "owed",
				})),
				...balance.items.owingItems.map((item) => ({
					id: item._id,
					name: item.name,
					share: item.share,
					type: "owing",
				})),
			];

			const totalAmount = balance.owed + balance.owing;

			// Send resolution request via Ably
			const resolutionData = {
				senderId: user._id,
				senderName: user.name,
				recipientId: memberId,
				recipientName: balance.memberInfo.name,
				amount: totalAmount,
				items: allSettlementItems,
				direction: balance.net < 0 ? "paying" : "collecting", // Determine direction based on net balance
				netAmount: balance.net,
			};

			await channel.publish("resolutionRequest", resolutionData);

			// Add to pending resolutions
			setPendingResolutions((prev) => ({
				...prev,
				[memberId]: {
					...resolutionData,
					sentAt: Date.now(),
					expiresAt: Date.now() + 10 * 60 * 1000,
				},
			}));

			// Auto-remove after 10 minutes
			setTimeout(() => {
				setPendingResolutions((prev) => {
					const newState = { ...prev };
					delete newState[memberId];
					return newState;
				});
			}, 10 * 60 * 1000);
		} catch (error) {
			console.error("Error sending resolution request:", error);
		}
	};

	const handleResolutionResponse = async (senderId, accepted) => {
		try {
			if (accepted) {
				const resolution = incomingResolutions[senderId];
				if (!resolution) {
					console.log("No resolution found for senderId:", senderId);
					return;
				}

				console.log("=== SETTLEMENT DEBUG INFO ===");
				console.log("User:", user);
				console.log("Resolution:", resolution);
				console.log("Balances:", balances);

				// Process settlement for ALL items (both owed and owing)
				const owedItems = resolution.items.filter((item) => item.type === "owed");
				const owingItems = resolution.items.filter((item) => item.type === "owing");

				let settlementSuccessful = true;

				// Mark owed items as paid
				// For "owed" items: sender owes recipient money
				// This means the sender (Awab) is owed money BY the recipient (DERAR)
				// When DERAR accepts, DERAR is paying Awab
				// So we mark DERAR as paid in Awab's items
				if (owedItems.length > 0) {
					console.log("Owed items: recipient paying sender");
					console.log("Sending owed items request:", {
						senderId: user._id, // DERAR (recipient) is paying
						recipientId: senderId, // Awab (sender) is being paid
						items: owedItems,
						direction: "paying",
					});
					console.log("Detailed owed items:", JSON.stringify(owedItems, null, 2));

					try {
						// For owed items: recipient owes sender money
						// Mark recipient (current user) as paid in items authored by sender
						const testResponse = await axios.patch(
							"/api/items/resolve-balance",
							{
								senderId: user._id, // DERAR (who is paying)
								recipientId: senderId, // Awab (who is being paid/author)
								items: owedItems,
								direction: "paying",
							},
							{
								withCredentials: true,
							}
						);
						console.log("Owed items success response:", testResponse.data);
					} catch (error) {
						console.error("Error processing owed items:", {
							status: error.response?.status,
							statusText: error.response?.statusText,
							data: error.response?.data,
						});
						settlementSuccessful = false;
					}
				}

				// Mark owing items as paid (recipient paying to sender)
				if (owingItems.length > 0) {
					console.log("Sending owing items request:", {
						senderId: user._id,
						recipientId: senderId,
						items: owingItems,
						direction: "paying",
					});
					console.log("Detailed owing items:", JSON.stringify(owingItems, null, 2));

					try {
						const response = await axios.patch(
							"/api/items/resolve-balance",
							{
								senderId: user._id,
								recipientId: senderId,
								items: owingItems,
								direction: "paying",
							},
							{
								withCredentials: true,
							}
						);
						console.log("Owing items success response:", response.data);
					} catch (error) {
						console.error("Error processing owing items:", {
							status: error.response?.status,
							statusText: error.response?.statusText,
							data: error.response?.data,
						});
						settlementSuccessful = false;
					}
				}

				// Only create settlement transaction if API calls were successful
				if (settlementSuccessful) {
					// Create settlement transaction record (only recipient creates it)
					const balance = balances[senderId];
					if (balance) {
						const settlementData = {
							settlementWithId: senderId,
							settlementWithName: resolution.senderName,
							direction: resolution.netAmount < 0 ? "paying" : "collecting",
							owedItems: owedItems,
							owingItems: owingItems,
							netAmount: resolution.netAmount,
							notes: `Settlement with ${resolution.senderName} - All items resolved`,
						};

						try {
							await axios.post("/api/payment-transactions/create-settlement", settlementData, {
								withCredentials: true,
							});
							console.log("Settlement transaction created successfully");
						} catch (error) {
							console.error("Error creating settlement transaction:", error);
						}
					}

					// Emit Ably event to notify sender
					if (channel) {
						try {
							await channel.publish("resolutionResponse", {
								senderId,
								recipientId: user._id,
								accepted: true,
							});

							// Emit fetch update to update all clients
							await channel.publish("fetchUpdate", {});
							console.log("Ably events published successfully");
						} catch (error) {
							console.error("Error publishing Ably events:", error);
						}
					}
				} else {
					console.error("Settlement failed - some API calls were unsuccessful");
				}
			} else {
				// Just notify sender of rejection
				if (channel) {
					try {
						await channel.publish("resolutionResponse", {
							senderId,
							recipientId: user._id,
							accepted: false,
						});
						console.log("Rejection notification sent");
					} catch (error) {
						console.error("Error sending rejection notification:", error);
					}
				}
			}

			// Remove from incoming resolutions regardless of success/failure
			setIncomingResolutions((prev) => {
				const newState = { ...prev };
				delete newState[senderId];
				return newState;
			});
		} catch (error) {
			console.error("Error in handleResolutionResponse:", error);
			// Don't throw the error to prevent page crashes
		}
	};

	const formatTimeRemaining = (expiresAt) => {
		const remaining = Math.max(0, expiresAt - currentTime);
		const minutes = Math.floor(remaining / 60000);
		const seconds = Math.floor((remaining % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	return (
		<div className={classes.netBalance}>
			<h3 className={classes.title}>
				<FaExchangeAlt className={classes.titleIcon} />
				Net Balance
			</h3>

			{/* Incoming Resolution Requests */}
			{Object.keys(incomingResolutions).length > 0 && (
				<div className={classes.incomingSection}>
					<h4 className={classes.sectionTitle}>Pending Confirmations</h4>
					{Object.entries(incomingResolutions).map(([senderId, resolution]) => (
						<div key={senderId} className={classes.resolutionRequest}>
							<div className={classes.requestHeader}>
								<span className={classes.senderName}>{resolution.senderName}</span>
								<span className={classes.amount}>${resolution.amount.toFixed(2)}</span>
							</div>
							<p className={classes.requestText}>
								Wants to settle up all {resolution.items.length} item{resolution.items.length > 1 ? "s" : ""} between
								you
							</p>
							<div className={classes.requestActions}>
								<button
									onClick={() => handleResolutionResponse(senderId, true)}
									className={`${classes.actionBtn} ${classes.acceptBtn}`}
								>
									<FaCheck /> Accept
								</button>
								<button
									onClick={() => handleResolutionResponse(senderId, false)}
									className={`${classes.actionBtn} ${classes.rejectBtn}`}
								>
									<FaTimes /> Decline
								</button>
							</div>
							<div className={classes.timer}>
								<FaClock /> {formatTimeRemaining(resolution.expiresAt)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Member Balances */}
			<div className={classes.balancesSection}>
				{Object.keys(balances).length > 0 ? (
					Object.entries(balances).map(([memberId, balance]) => {
						const isPending = pendingResolutions[memberId];
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
												They owe you:
											</span>
											<span className={classes.owedAmount}>${balance.owed.toFixed(2)}</span>
										</div>
									)}

									{balance.owing > 0 && (
										<div className={classes.balanceRow}>
											<span className={classes.balanceLabel}>
												<PiHandDepositFill className={classes.balanceIcon} />
												You owe them:
											</span>
											<span className={classes.owingAmount}>${balance.owing.toFixed(2)}</span>
										</div>
									)}
								</div>

								{/* Show settle button for any balance (positive or negative) */}
								<div className={classes.actionSection}>
									{isPending ? (
										<div className={classes.pendingStatus}>
											<FaClock className={classes.pendingIcon} />
											<span>Awaiting confirmation...</span>
											<span className={classes.pendingTimer}>{formatTimeRemaining(isPending.expiresAt)}</span>
										</div>
									) : (
										<button onClick={() => handleResolveBalance(memberId)} className={classes.resolveBtn}>
											<FaExchangeAlt className={classes.resolveIcon} />
											Settle Up ${Math.abs(netAmount).toFixed(2)}
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

export default NetBalanceAbly;
