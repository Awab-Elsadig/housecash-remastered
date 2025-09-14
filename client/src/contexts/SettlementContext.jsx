import { useCallback, useEffect, useRef, useState } from "react";
import { SettlementContext } from "./SettlementContextDef";
import ably from "../ablyConfig"; // shared singleton
import axios from "axios";

// New settlement flow (stateless backend assisted):
// 1. Client sends POST /api/settlements/request { targetUserId }
// 2. Server validates bilateral outstanding items and broadcasts Ably event settlement:request to both users' personal channels.
// 3. Receiver can accept or decline via POST /api/settlements/respond { requestId, accept }
// 4. On accept server sets paid on all bilateral unpaid items using existing batch logic then emits settlement:completed.
// 5. Both clients refetch items (house channel fetchUpdate already sent) and remove local request.
// NOTE: We still keep purely client-originated optimistic timer (120s) so a dead server response auto-clears.

export const SettlementProvider = ({ user, children }) => {
	const [requests, setRequests] = useState({}); // key otherUserId -> request object
	const timersRef = useRef({});
	const channelRef = useRef(null);

	// Fetch pending settlement requests when user data is available
	useEffect(() => {
		if (!user?._id || !user?.houseCode) return;
		
		// Fetch any pending settlement requests from the database
		const fetchPendingRequests = async () => {
			try {
				const { data } = await axios.get("/api/payment-approvals/pending");
				if (data.requests && data.requests.length > 0) {
					const settlementRequests = {};
					data.requests.forEach(req => {
						if (req.type === "settlement") {
							const otherId = req.direction === "outgoing" ? req.toUserId : req.fromUserId;
							const remaining = Math.ceil((req.expiresAt - Date.now()) / 1000);
							console.log(`Settlement request ${req.id}: expiresAt=${req.expiresAt}, remaining=${remaining}s`);
							settlementRequests[otherId] = {
								...req,
								expiresAt: req.expiresAt,
							};
							// Set up timer for expiration
							if (req.expiresAt > Date.now()) {
								timersRef.current[otherId] = setTimeout(() => cancelSettlementRequest(otherId, true), req.expiresAt - Date.now());
							}
						}
					});
					setRequests(settlementRequests);
				}
			} catch (error) {
				console.error("Failed to fetch pending settlement requests:", error);
			}
		};

		// Add a small delay to ensure user data is fully loaded
		const timeoutId = setTimeout(fetchPendingRequests, 100);
		return () => clearTimeout(timeoutId);
	}, [user?._id, user?.houseCode]);

	// Subscribe to personal settlement channel
	useEffect(() => {
		if (!user?._id) return;
		channelRef.current = ably.channels.get(`user:settlement:${user._id}`);

		const onRequest = ({ data }) => {
			setRequests((prev) => ({
				...prev,
				[data.fromUserId === user._id ? data.toUserId : data.fromUserId]: {
					...data,
					type: data.fromUserId === user._id ? "outgoing" : "incoming",
					expiresAt: Date.now() + 60_000,
				},
			}));
		};
		const onCompleted = ({ data }) => {
			setRequests((prev) => {
				const copy = { ...prev };
				delete copy[data.otherUserId];
				return copy;
			});
		};
		const onCancelled = ({ data }) => {
			setRequests((prev) => {
				const copy = { ...prev };
				delete copy[data.otherUserId];
				return copy;
			});
		};

		channelRef.current.subscribe("settlement:request", onRequest);
		channelRef.current.subscribe("settlement:completed", onCompleted);
		channelRef.current.subscribe("settlement:cancelled", onCancelled);
		return () => {
			try {
				channelRef.current.unsubscribe("settlement:request", onRequest);
				channelRef.current.unsubscribe("settlement:completed", onCompleted);
				channelRef.current.unsubscribe("settlement:cancelled", onCancelled);
			} catch {
				/* ignore */
			}
			Object.values(timersRef.current).forEach((t) => clearTimeout(t));
			timersRef.current = {};
		};
	}, [user?._id]);

	const removeExpired = useCallback((otherId) => {
		setRequests((prev) => {
			const req = prev[otherId];
			if (!req) return prev;
			if (req.expiresAt < Date.now()) {
				const copy = { ...prev };
				delete copy[otherId];
				return copy;
			}
			return prev;
		});
	}, []);

	// Cancel first so settleUp can reference it without missing dep warnings
	const cancelSettlementRequest = useCallback(
		async (otherUserId, silent = false) => {
			const req = requests[otherUserId];
			if (!req) return;
			if (timersRef.current[otherUserId]) {
				clearTimeout(timersRef.current[otherUserId]);
				delete timersRef.current[otherUserId];
			}
			setRequests((prev) => {
				const copy = { ...prev };
				delete copy[otherUserId];
				return copy;
			});
			if (silent) return;
			try {
				await axios.post("/api/settlements/cancel", { requestId: req.id });
			} catch (e) {
				console.error("Cancel failed", e);
			}
		},
		[requests]
	);

	// Send request
	const settleUp = useCallback(
		async (otherUserId, name, amount) => {
			if (!user?._id || !otherUserId || requests[otherUserId]) return false;
			try {
				const { data } = await axios.post("/api/settlements/request", { targetUserId: otherUserId });
				const expiresAt = Date.now() + 60_000;
				setRequests((prev) => ({
					...prev,
					[otherUserId]: {
						id: data.requestId,
						fromUserId: user._id,
						toUserId: otherUserId,
						name,
						amount,
						type: "outgoing",
						expiresAt,
					},
				}));
				timersRef.current[otherUserId] = setTimeout(() => cancelSettlementRequest(otherUserId, true), 60_000);
				return true;
			} catch (e) {
				console.error("Failed to create settlement request", e);
				return false;
			}
		},
		[user?._id, requests, cancelSettlementRequest]
	);

	const respond = useCallback(
		async (otherUserId, accept, itemIds = []) => {
			const req = requests[otherUserId];
			if (!req) return { success: false, message: "Request not found." };
			if (req.expiresAt < Date.now()) {
				removeExpired(otherUserId);
				return { success: false, message: "Expired" };
			}
			try {
				const { data } = await axios.post("/api/settlements/respond", { requestId: req.id, accept, itemIds });
				setRequests((prev) => {
					const copy = { ...prev };
					delete copy[otherUserId];
					return copy;
				});
				return { success: true, settlementProcessed: data.processed };
			} catch (e) {
				console.error("Settlement response failed", e);
				return { success: false, message: e.response?.data?.message || "An unknown error occurred." };
			}
		},
		[requests, removeExpired]
	);

	const acceptSettlement = (otherUserId, itemIds) => respond(otherUserId, true, itemIds);
	const declineSettlement = (otherUserId) => respond(otherUserId, false);

	// (cancelSettlementRequest moved above)

	const getSettlementTimeRemaining = useCallback(
		(otherUserId) => {
			const req = requests[otherUserId];
			if (!req) return 0;
			if (req.expiresAt < Date.now()) {
				removeExpired(otherUserId);
				return 0;
			}
			const remaining = Math.ceil((req.expiresAt - Date.now()) / 1000);
			console.log(`Settlement timer for ${otherUserId}: expiresAt=${req.expiresAt}, now=${Date.now()}, remaining=${remaining}s`);
			return Math.max(0, remaining);
		},
		[requests, removeExpired]
	);

	return (
		<SettlementContext.Provider
			value={{
				settlementRequests: requests,
				settleUp,
				acceptSettlement,
				declineSettlement,
				cancelSettlementRequest,
				getSettlementTimeRemaining,
			}}
		>
			{children}
		</SettlementContext.Provider>
	);
};

export default SettlementProvider;
// (Old implementation removed during rewrite)
