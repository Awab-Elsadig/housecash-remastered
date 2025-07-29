import React, { useEffect, useState } from "react";
import classes from "./Dashboard.module.css";
import { FaHandHoldingUsd } from "react-icons/fa";
import { IoIosNotifications } from "react-icons/io";
import { PiHandDepositFill } from "react-icons/pi";
import { useUser } from "../../hooks/useUser";
import { useInitialLoading } from "../../hooks/useLoading";
import { DashboardSkeleton } from "../../components/Skeleton";
import axios from "axios";
import ably from "../../ablyConfig";
import NetBalance from "./NetBalance";

const Dashboard = () => {
	const { user, houseMembers, items, fetchItems, updateItems } = useUser();
	const isLoading = useInitialLoading(1000); // 1 second initial loading
	const [readyToCollect, setReadyToCollect] = useState(0);
	const [notPaidAmount, setNotPaidAmount] = useState(0);
	const [shouldPay, setShouldPay] = useState(0);
	const [paymentsByMember, setPaymentsByMember] = useState({});
	const [collectData, setCollectData] = useState({});
	const [notifyData, setNotifyData] = useState({});
	const [activeSection, setActiveSection] = useState("pay"); // Default to "pay" section

	// Ably connection and event handling
	useEffect(() => {
		if (!user?.houseCode) return;

		// Subscribe to house channel for real-time updates
		const channel = ably.channels.get(`house:${user.houseCode}`);

		// Listen for fetch updates
		const fetchUpdateHandler = () => {
			console.log("Received fetchUpdate event from Ably");
			fetchItems();
		};

		// Listen for item updates
		const itemUpdateHandler = (message) => {
			console.log("Received itemUpdate event from Ably:", message.data);
			fetchItems();
		};

		// Listen for payment notifications
		const paymentNotificationHandler = (message) => {
			console.log("Received paymentNotification event from Ably:", message.data);
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

	// Calculate amounts and organize data by member
	useEffect(() => {
		if (!user?._id || !items.length) return;

		let totalReadyToCollect = 0;
		let totalNotPaid = 0;
		let totalShouldPay = 0;
		const memberPayments = {};
		const collectData = {};
		const notifyData = {};
		const newNotifications = [];

		items.forEach((item) => {
			const share = item.price / item.members.length;
			const itemDate = new Date(item.createdAt);

			// Generate notifications
			if (item.author.toString() === user._id.toString()) {
				// Check for unpaid members
				item.members.forEach((member) => {
					const memberInfo = houseMembers.find((m) => m._id === member.userID);
					if (memberInfo && member.userID !== user._id && !member.paid) {
						newNotifications.push({
							id: `${item._id}-${member.userID}`,
							type: "payment_reminder",
							message: `${memberInfo.name.split(" ")[0]} hasn't paid for ${item.name}`,
							amount: share,
							itemName: item.name,
							memberName: memberInfo.name.split(" ")[0],
							date: itemDate,
							priority: "medium",
						});
					}
				});
			}

			if (item.author.toString() === user._id.toString()) {
				// For items you authored
				item.members.forEach((member) => {
					const memberInfo = houseMembers.find((m) => m._id === member.userID);
					if (memberInfo && member.userID !== user._id) {
						if (member.paid && !member.got) {
							totalReadyToCollect += share;
							// Add to collect data
							if (!collectData[member.userID]) {
								collectData[member.userID] = {
									memberInfo,
									items: [],
									total: 0,
								};
							}
							collectData[member.userID].items.push({
								...item,
								share,
							});
							collectData[member.userID].total += share;
						} else if (!member.paid) {
							totalNotPaid += share;
							// Add to notify data
							if (!notifyData[member.userID]) {
								notifyData[member.userID] = {
									memberInfo,
									items: [],
									total: 0,
								};
							}
							notifyData[member.userID].items.push({
								...item,
								share,
							});
							notifyData[member.userID].total += share;
						}
					}
				});
			} else {
				// For items where you are a participant
				const userMember = item.members.find((m) => m.userID === user._id);
				if (userMember && !userMember.paid) {
					totalShouldPay += share;

					const authorInfo = houseMembers.find((m) => m._id === item.author);
					if (authorInfo) {
						if (!memberPayments[item.author]) {
							memberPayments[item.author] = {
								memberInfo: authorInfo,
								items: [],
								total: 0,
							};
						}
						memberPayments[item.author].items.push({
							...item,
							share,
						});
						memberPayments[item.author].total += share;
					}
				}
			}
		});

		setReadyToCollect(totalReadyToCollect);
		setNotPaidAmount(totalNotPaid);
		setShouldPay(totalShouldPay);
		setPaymentsByMember(memberPayments);
		setCollectData(collectData);
		setNotifyData(notifyData);
	}, [items, user, houseMembers]);

	// Handle section changes without executing functions
	const handleCollectAll = () => {
		setActiveSection("collect");
	};

	const handleNotifyAll = () => {
		setActiveSection("notify");
	};

	const handlePayAllDebts = () => {
		setActiveSection("pay");
	};

	const handlePayItem = async (itemId) => {
		if (!user?._id) return;

		try {
			const item = items.find((i) => i._id === itemId);
			if (!item) return;

			const updatedMembers = item.members.map((member) => {
				if (member.userID === user._id) {
					return { ...member, paid: !member.paid };
				}
				return member;
			});

			await axios.patch(`/api/items/update-item/${itemId}`, {
				...item,
				members: updatedMembers,
			});

			// The server will handle Ably notifications via AblyService
			fetchItems();
		} catch (error) {
			console.error("Error updating payment:", error);
		}
	};

	const handleCollectFromMember = async (memberId) => {
		if (!user?._id) return;

		try {
			await axios.patch("/api/items/get-all", {
				memberId,
				userId: user._id,
			});

			// The server will handle Ably notifications via AblyService
			fetchItems();
		} catch (error) {
			console.error("Error collecting from member:", error);
		}
	};

	const handleNotifyMember = async (memberId) => {
		try {
			const memberData = notifyData[memberId];
			if (!memberData) return;

			// Create context-aware notification message
			const itemCount = memberData.items.length;
			const totalAmount = memberData.total;
			const memberName = memberData.memberInfo.name.split(" ")[0];

			let message;
			if (itemCount === 1) {
				message = `💰 Hey ${memberName}! You owe $${totalAmount.toFixed(2)} for "${
					memberData.items[0].name
				}". Time to settle up! 🏠`;
			} else {
				message = `💰 Hey ${memberName}! You owe $${totalAmount.toFixed(
					2
				)} for ${itemCount} items totaling $${totalAmount.toFixed(2)}. Time to settle up! 🏠`;
			}

			// Send notification through API
			const notificationPayload = {
				recipientId: memberId,
				message: message,
				type: "payment_reminder",
				metadata: {
					itemCount,
					totalAmount,
					items: memberData.items.map((item) => ({
						id: item._id,
						name: item.name,
						amount: item.share,
					})),
				},
			};

			const response = await axios.post("/api/notifications", notificationPayload, {
				withCredentials: true,
			});

			if (response.data.success) {
				console.log(`Notification sent to ${memberName}`);
				// Optional: Show success message to user
				// You could add a toast notification here
			}
		} catch (error) {
			console.error("Error sending notification:", error);
			// Optional: Show error message to user
		}
	};

	const handlePayAllToMember = async (memberId) => {
		if (!user?._id) return;

		try {
			const updatedItems = items.map((item) => {
				if (item.author.toString() === memberId && item.author.toString() !== user._id.toString()) {
					const updatedMembers = item.members.map((member) => {
						if (member.userID.toString() === user._id.toString() && !member.paid) {
							return { ...member, paid: true };
						}
						return member;
					});
					return { ...item, members: updatedMembers };
				}
				return item;
			});

			// Optimistically update UI
			updateItems(updatedItems);

			await axios.patch("/api/items/pay-all", {
				memberId,
				userId: user?._id,
			});

			// The server will handle Ably notifications via AblyService
			fetchItems();
		} catch (error) {
			console.error("Error paying all to member:", error);
			// Revert on error
			fetchItems();
		}
	};

	const renderMiddleSection = () => {
		switch (activeSection) {
			case "collect":
				return (
					<>
						<span className={classes.title}>Ready to Collect</span>
						{Object.keys(collectData).length > 0 ? (
							Object.entries(collectData).map(([memberId, memberData]) => (
								<div key={memberId} className={classes.member}>
									<div className={classes.memberTop}>
										<h3>{memberData.memberInfo.name.split(" ")[0]}</h3>
										<button
											onClick={() => handleCollectFromMember(memberId)}
											className={`${classes.actionButton} ${classes.collectButton}`}
										>
											Collect from {memberData.memberInfo.name.split(" ")[0]}{" "}
											<FaHandHoldingUsd className={classes.icon} />
										</button>
									</div>
									<ul className={classes.items}>
										{memberData.items.map((item) => (
											<li key={item._id} className={classes.item}>
												<span className={classes.itemName}>{item.name}</span>
												<span className={classes.itemRight}>
													<span className={classes.itemPrice}>
														<span className={classes.share}>${item.share.toFixed(2)}</span>
														/${item.price.toFixed(2)}
													</span>
												</span>
											</li>
										))}
									</ul>
									<div className={classes.total}>
										<span className={classes.totalText}>Total to Collect</span>
										<span className={`${classes.totalPrice} ${classes.collectPrice}`}>
											${memberData.total.toFixed(2)}
										</span>
									</div>
								</div>
							))
						) : (
							<p>Nothing ready to collect</p>
						)}
					</>
				);

			case "notify":
				return (
					<>
						<span className={classes.title}>Notify the following</span>
						{Object.keys(notifyData).length > 0 ? (
							Object.entries(notifyData).map(([memberId, memberData]) => (
								<div key={memberId} className={classes.member}>
									<div className={classes.memberTop}>
										<h3>{memberData.memberInfo.name.split(" ")[0]}</h3>
										<button
											onClick={() => handleNotifyMember(memberId)}
											className={`${classes.actionButton} ${classes.notifyButton}`}
										>
											Notify {memberData.memberInfo.name.split(" ")[0]} <IoIosNotifications className={classes.icon} />
										</button>
									</div>
									<ul className={classes.items}>
										{memberData.items.map((item) => (
											<li key={item._id} className={classes.item}>
												<span className={classes.itemName}>{item.name}</span>
												<span className={classes.itemRight}>
													<span className={classes.itemPrice}>
														<span className={classes.share}>${item.share.toFixed(2)}</span>
														/${item.price.toFixed(2)}
													</span>
												</span>
											</li>
										))}
									</ul>
									<div className={classes.total}>
										<span className={classes.totalText}>Total Owed</span>
										<span className={`${classes.totalPrice} ${classes.notifyPrice}`}>
											${memberData.total.toFixed(2)}
										</span>
									</div>
								</div>
							))
						) : (
							<p>Everyone has paid!</p>
						)}
					</>
				);

			case "pay":
			default:
				return (
					<>
						<span className={classes.title}>Pay the following</span>
						{Object.keys(paymentsByMember).length > 0 ? (
							Object.entries(paymentsByMember).map(([memberId, memberData]) => (
								<div key={memberId} className={classes.member}>
									<div className={classes.memberTop}>
										<h3>{memberData.memberInfo.name.split(" ")[0]}</h3>
										<button
											onClick={() => handlePayAllToMember(memberId)}
											className={`${classes.actionButton} ${classes.payButton}`}
										>
											Pay {memberData.memberInfo.name.split(" ")[0]} <PiHandDepositFill className={classes.icon} />
										</button>
									</div>
									<ul className={classes.items}>
										{memberData.items.map((item) => (
											<li key={item._id} className={classes.item}>
												<span className={classes.itemName}>{item.name}</span>
												<span className={classes.itemRight}>
													<span className={classes.itemPrice}>
														<span className={classes.share}>${item.share.toFixed(2)}</span>
														/${item.price.toFixed(2)}
													</span>
													<button onClick={() => handlePayItem(item._id)} className={classes.payItemButton}>
														<PiHandDepositFill className={classes.icon} />
													</button>
												</span>
											</li>
										))}
									</ul>
									<div className={classes.total}>
										<span className={classes.totalText}>Total</span>
										<span className={`${classes.totalPrice} ${classes.payPrice}`}>${memberData.total.toFixed(2)}</span>
									</div>
								</div>
							))
						) : (
							<p>No pending payments</p>
						)}
					</>
				);
		}
	};

	return (
		<div className={classes.dashboard}>
			{isLoading || !user ? (
				<DashboardSkeleton />
			) : (
				<>
					<div className={classes.left}>
						<div className={classes.readyToCollect}>
							<span className={classes.paymentSpan}>
								<p>Ready to Collect</p>
								<button
									onClick={handleCollectAll}
									className={`${classes.paymentButton} ${activeSection === "collect" ? classes.activeButton : ""}`}
									style={{
										opacity: activeSection === "collect" ? 1 : 0.8,
										transform: activeSection === "collect" ? "scale(1.02)" : "scale(1)",
										transition: "all 0.3s ease",
										boxShadow: activeSection === "collect" ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
									}}
								>
									<FaHandHoldingUsd className={classes.icon} /> Collect
								</button>
							</span>
							<span className={classes.price}>${readyToCollect.toFixed(2)}</span>
						</div>
						<div className={classes.shouldCollect}>
							<span className={classes.paymentSpan}>
								<p>Should Collect</p>
								<button
									onClick={handleNotifyAll}
									className={`${classes.paymentButton} ${activeSection === "notify" ? classes.activeButton : ""}`}
									style={{
										opacity: activeSection === "notify" ? 1 : 0.8,
										transform: activeSection === "notify" ? "scale(1.02)" : "scale(1)",
										transition: "all 0.3s ease",
										boxShadow: activeSection === "notify" ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
									}}
								>
									<IoIosNotifications className={classes.icon} />
									Notify
								</button>
							</span>
							<span className={classes.price}>${notPaidAmount.toFixed(2)}</span>
						</div>
						<div className={classes.shouldPay}>
							<span className={classes.paymentSpan}>
								<p>Should Pay</p>
								<button
									onClick={handlePayAllDebts}
									className={`${classes.paymentButton} ${activeSection === "pay" ? classes.activeButton : ""}`}
									style={{
										opacity: activeSection === "pay" ? 1 : 0.8,
										transform: activeSection === "pay" ? "scale(1.02)" : "scale(1)",
										transition: "all 0.3s ease",
										boxShadow: activeSection === "pay" ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
									}}
								>
									<PiHandDepositFill className={classes.icon} /> Pay
								</button>
							</span>
							<span className={classes.price}>${shouldPay.toFixed(2)}</span>
						</div>
					</div>
					<div className={classes.middle}>
						<div className={`${classes.middleContent} ${classes[activeSection + "Section"]}`} key={activeSection}>
							{renderMiddleSection()}
						</div>
					</div>
					<div className={classes.right}>
						<NetBalance user={user} houseMembers={houseMembers} items={items} onDataRefresh={fetchItems} />
					</div>
				</>
			)}
		</div>
	);
};

export default Dashboard;
