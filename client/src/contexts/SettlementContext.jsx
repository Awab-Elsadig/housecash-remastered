import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Realtime } from "ably";
import { useUser } from "../hooks/useUser";

const SettlementContext = createContext();

export const useSettlement = () => {
	const context = useContext(SettlementContext);
	if (!context) {
		throw new Error("useSettlement must be used within a SettlementProvider");
	}
	return context;
};

export const SettlementProvider = ({ children }) => {
	const { user } = useUser();
	const [settlementRequests, setSettlementRequests] = useState({});
	const [isProcessing, setIsProcessing] = useState({});

	// Keep track of Ably connection to prevent multiple instances
	const ablyConnectionRef = useRef(null);
	const channelRef = useRef(null);

	// Load settlement requests from localStorage on component mount
	useEffect(() => {
		if (!user?._id) return;

		const savedRequests = localStorage.getItem(`settlementRequests_${user._id}`);
		if (savedRequests) {
			try {
				const parsed = JSON.parse(savedRequests);
				// Filter out expired requests
				const now = Date.now();
				const validRequests = Object.keys(parsed).reduce((acc, memberId) => {
					const request = parsed[memberId];
					if (request.expiresAt && request.expiresAt > now) {
						acc[memberId] = request;
					}
					return acc;
				}, {});

				setSettlementRequests(validRequests);

				// Update localStorage if we filtered out any expired requests
				if (Object.keys(validRequests).length !== Object.keys(parsed).length) {
					localStorage.setItem(`settlementRequests_${user._id}`, JSON.stringify(validRequests));
				}
			} catch (error) {
				console.error("Error loading settlement requests:", error);
			}
		}
	}, [user?._id]);

	// Save settlement requests to localStorage whenever they change
	useEffect(() => {
		if (!user?._id) return;

		localStorage.setItem(`settlementRequests_${user._id}`, JSON.stringify(settlementRequests));
	}, [settlementRequests, user?._id]);

	// Force re-render every second to update countdown timers
	useEffect(() => {
		const timer = setInterval(() => {
			// This will force a re-render to update the countdown display
			const hasActiveRequests = Object.values(settlementRequests).some((req) => req.expiresAt);
			if (hasActiveRequests) {
				// Force update by creating a new object
				setSettlementRequests((prev) => ({ ...prev }));
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [settlementRequests]);

	// Set up Ably for real-time settlement requests with proper connection management
	useEffect(() => {
		if (!user?._id || !user?.houseCode) return;

		let cleanupInterval = null;
		let isComponentMounted = true;

		const initializeAbly = async () => {
			try {
				// Only create a new connection if we don't have one or it's closed
				if (!ablyConnectionRef.current || ablyConnectionRef.current.connection.state === "closed") {
					ablyConnectionRef.current = new Realtime({
						key: import.meta.env.VITE_ABLY_API_KEY,
						clientId: user._id,
					});
				}

				channelRef.current = ablyConnectionRef.current.channels.get(`house-${user.houseCode}`);

				// Listen for incoming settlement requests
				const handleSettlementRequest = (message) => {
					if (!isComponentMounted) return;

					const { recipientId, senderId, senderName, amount, requestId } = message.data;

					// Only show if this request is for the current user
					if (recipientId === user._id) {
						const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes from now

						setSettlementRequests((prev) => ({
							...prev,
							[senderId]: {
								type: "incoming",
								senderId,
								senderName,
								amount,
								requestId,
								expiresAt,
							},
						}));
					}
				};

				// Listen for settlement request responses
				const handleSettlementResponse = async (message) => {
					if (!isComponentMounted) return;

					const { requestId, accepted, senderId } = message.data;

					console.log("Settlement response received:", { requestId, accepted, senderId });

					// Clear pending request if this is our request
					setSettlementRequests((prev) => {
						const updated = { ...prev };
						// Find and remove the request
						Object.keys(updated).forEach((memberId) => {
							if (updated[memberId]?.requestId === requestId) {
								delete updated[memberId];
							}
						});
						return updated;
					});

					// Note: The actual settlement processing will be handled by the NetBalance component
					// when the user navigates back to the dashboard
				};

				// Listen for settlement cancellations
				const handleSettlementCancelled = (message) => {
					if (!isComponentMounted) return;

					const { requestId } = message.data;

					// Clear request
					setSettlementRequests((prev) => {
						const updated = { ...prev };
						Object.keys(updated).forEach((memberId) => {
							if (updated[memberId]?.requestId === requestId) {
								delete updated[memberId];
							}
						});
						return updated;
					});
				};

				// Set up periodic cleanup of expired requests
				cleanupInterval = setInterval(() => {
					if (!isComponentMounted) return;

					const now = Date.now();
					setSettlementRequests((prev) => {
						const updated = { ...prev };
						let hasChanges = false;

						Object.keys(updated).forEach((memberId) => {
							if (updated[memberId].expiresAt && updated[memberId].expiresAt <= now) {
								delete updated[memberId];
								hasChanges = true;
							}
						});

						return hasChanges ? updated : prev;
					});
				}, 10000); // Check every 10 seconds

				// Subscribe to events
				channelRef.current.subscribe("settlement-request", handleSettlementRequest);
				channelRef.current.subscribe("settlement-response", handleSettlementResponse);
				channelRef.current.subscribe("settlement-cancelled", handleSettlementCancelled);
			} catch (error) {
				console.error("Error setting up Ably connection:", error);
			}
		};

		initializeAbly();

		return () => {
			isComponentMounted = false;

			try {
				if (cleanupInterval) {
					clearInterval(cleanupInterval);
				}

				if (channelRef.current) {
					channelRef.current.unsubscribe();
					channelRef.current = null;
				}

				// Don't close the main connection - let it stay alive for other components
				if (ablyConnectionRef.current && ablyConnectionRef.current.connection.state !== "closed") {
					// Keep connection alive for other uses
				}
			} catch (error) {
				console.error("Error cleaning up Ably connection:", error);
			}
		};
	}, [user?._id, user?.houseCode]);

	// Send settlement request using the shared connection
	const sendSettlementRequest = useCallback(
		async (memberId, memberName, amount) => {
			// Guard against user not being available
			if (!user?._id || !user?.houseCode) {
				console.error("User not available for sending settlement request");
				return false;
			}

			if (isProcessing[memberId]) return false;

			const requestId = `${user._id}-${memberId}-${Date.now()}`;

			try {
				// Use the shared connection if available, otherwise create a temporary one
				let ably = ablyConnectionRef.current;
				let shouldCloseConnection = false;

				if (!ably || ably.connection.state === "closed") {
					ably = new Realtime({
						key: import.meta.env.VITE_ABLY_API_KEY,
						clientId: user._id,
					});
					shouldCloseConnection = true;
				}

				const channel = ably.channels.get(`house-${user.houseCode}`);

				// Send settlement request via Ably
				await channel.publish("settlement-request", {
					senderId: user._id,
					senderName: user.name,
					recipientId: memberId,
					amount: amount,
					requestId,
				});

				const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes from now

				// Set pending outgoing request for this member
				setSettlementRequests((prev) => ({
					...prev,
					[memberId]: {
						type: "outgoing",
						memberId,
						memberName,
						requestId,
						amount: amount,
						expiresAt,
					},
				}));

				// Auto-expire after 2 minutes
				setTimeout(() => {
					setSettlementRequests((prev) => {
						if (prev[memberId]?.requestId === requestId) {
							// Send cancellation
							channel
								.publish("settlement-cancelled", {
									requestId,
									recipientId: memberId,
								})
								.catch((error) => {
									console.error("Error sending cancellation:", error);
								});
							const updated = { ...prev };
							delete updated[memberId];
							return updated;
						}
						return prev;
					});

					// Close temporary connection if we created one
					if (shouldCloseConnection && ably && ably.connection.state !== "closed") {
						ably.close();
					}
				}, 2 * 60 * 1000);

				// Close temporary connection after a delay if we created one
				if (shouldCloseConnection) {
					setTimeout(() => {
						if (ably && ably.connection.state !== "closed") {
							ably.close();
						}
					}, 5000); // Give it more time to ensure the message was sent
				}

				return true;
			} catch (error) {
				console.error("Error sending settlement request:", error);
				return false;
			}
		},
		[isProcessing, user?._id, user?.name, user?.houseCode]
	);

	// Respond to settlement request using shared connection
	const respondToSettlementRequest = useCallback(
		async (memberId, accepted) => {
			// Guard against user not being available
			if (!user?._id || !user?.houseCode) {
				console.error("User not available for responding to settlement request");
				return { success: false, error: "User not available" };
			}

			const request = settlementRequests[memberId];
			if (!request || request.type !== "incoming") return false;

			try {
				// Use the shared connection if available, otherwise create a temporary one
				let ably = ablyConnectionRef.current;
				let shouldCloseConnection = false;

				if (!ably || ably.connection.state === "closed") {
					ably = new Realtime({
						key: import.meta.env.VITE_ABLY_API_KEY,
						clientId: user._id,
					});
					shouldCloseConnection = true;
				}

				const channel = ably.channels.get(`house-${user.houseCode}`);

				// Send response via Ably
				await channel.publish("settlement-response", {
					requestId: request.requestId,
					accepted,
					senderId: request.senderId,
				});

				// Clear the request
				setSettlementRequests((prev) => {
					const updated = { ...prev };
					delete updated[memberId];
					return updated;
				});

				// Close temporary connection if we created one
				if (shouldCloseConnection) {
					setTimeout(() => {
						if (ably && ably.connection.state !== "closed") {
							ably.close();
						}
					}, 1000);
				}

				return { success: true, accepted, senderId: request.senderId };
			} catch (error) {
				console.error("Error responding to settlement request:", error);
				return { success: false, error: error.message };
			}
		},
		[settlementRequests, user?._id, user?.houseCode]
	);

	// Clear a specific settlement request
	const clearSettlementRequest = useCallback((memberId) => {
		setSettlementRequests((prev) => {
			const updated = { ...prev };
			delete updated[memberId];
			return updated;
		});
	}, []);

	// Get active incoming requests count for notifications
	const getIncomingRequestsCount = useCallback(() => {
		return Object.values(settlementRequests).filter((req) => req.type === "incoming").length;
	}, [settlementRequests]);

	const value = {
		settlementRequests,
		isProcessing,
		setIsProcessing,
		sendSettlementRequest,
		respondToSettlementRequest,
		clearSettlementRequest,
		getIncomingRequestsCount,
	};

	return <SettlementContext.Provider value={value}>{children}</SettlementContext.Provider>;
};
