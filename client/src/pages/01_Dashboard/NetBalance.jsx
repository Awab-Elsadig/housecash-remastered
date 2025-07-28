import React, { useState, useEffect } from "react";
import { FaHandHoldingUsd, FaExchangeAlt } from "react-icons/fa";
import { PiHandDepositFill } from "react-icons/pi";
import classes from "./NetBalance.module.css";
import axios from "axios";

const NetBalance = ({ user, houseMembers, items }) => {
	const [balances, setBalances] = useState({});
	const [isProcessing, setIsProcessing] = useState({});

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

	const handleSettleUp = async (memberId) => {
		const balance = balances[memberId];
		if (!balance || isProcessing[memberId]) return;

		setIsProcessing((prev) => ({ ...prev, [memberId]: true }));

		try {
			// Process owed items (they owe you - mark them as paid)
			if (balance.items.owedItems.length > 0) {
				for (const item of balance.items.owedItems) {
					await axios.patch(
						"/api/items/resolve-balance",
						{
							senderId: memberId, // The person who owes money (to be marked paid)
							recipientId: user._id, // The person who is owed money (author)
							items: [
								{
									id: item._id,
									name: item.name,
									share: item.share,
									type: "owed",
								},
							],
							direction: "paying",
						},
						{
							withCredentials: true,
						}
					);
				}
			}

			// Process owing items (you owe them - mark yourself as paid)
			if (balance.items.owingItems.length > 0) {
				for (const item of balance.items.owingItems) {
					await axios.patch(
						"/api/items/resolve-balance",
						{
							senderId: user._id, // You are paying
							recipientId: memberId, // They are being paid (author)
							items: [
								{
									id: item._id,
									name: item.name,
									share: item.share,
									type: "owing",
								},
							],
							direction: "paying",
						},
						{
							withCredentials: true,
						}
					);
				}
			}

			// Create settlement transaction record
			const settlementData = {
				settlementWithId: memberId,
				settlementWithName: balance.memberInfo.name,
				direction: "settling",
				owedItems: balance.items.owedItems.map((item) => ({
					id: item._id,
					name: item.name,
					share: item.share,
					type: "owed",
				})),
				owingItems: balance.items.owingItems.map((item) => ({
					id: item._id,
					name: item.name,
					share: item.share,
					type: "owing",
				})),
				netAmount: balance.net,
				notes: `Settlement with ${balance.memberInfo.name} - All items resolved`,
			};

			await axios.post("/api/payment-transactions/create-settlement", settlementData, {
				withCredentials: true,
			});

			// Refresh the page to show updated data
			window.location.reload();
		} catch (error) {
			console.error("Error settling up:", error);
			alert("Failed to settle up. Please try again.");
		} finally {
			setIsProcessing((prev) => ({ ...prev, [memberId]: false }));
		}
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

export default NetBalance;
