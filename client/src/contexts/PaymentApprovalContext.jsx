import { createContext, useCallback, useEffect, useRef, useState } from "react";
import ably from "../ablyConfig";
import axios from "axios";

export const PaymentApprovalContext = createContext();

export const PaymentApprovalProvider = ({ user, children }) => {
  const [requests, setRequests] = useState({}); // key otherUserId -> { id, items, type, expiresAt, direction }
  const timersRef = useRef({});
  const channelRef = useRef(null);

  // Fetch pending requests when user data is available
  useEffect(() => {
    if (!user?._id || !user?.houseCode) return;
    
    // Add a small delay to ensure user data is fully loaded
    const fetchPendingRequests = async () => {
      try {
        const { data } = await axios.get("/api/payment-approvals/pending");
        if (data.requests && data.requests.length > 0) {
          const formattedRequests = {};
          data.requests.forEach(req => {
            const otherId = req.direction === "outgoing" ? req.toUserId : req.fromUserId;
            const remaining = Math.ceil((req.expiresAt - Date.now()) / 1000);
            console.log(`Payment request ${req.id}: expiresAt=${req.expiresAt}, remaining=${remaining}s`);
            formattedRequests[otherId] = {
              ...req,
              expiresAt: req.expiresAt,
            };
            // Set up timer for expiration
            if (req.expiresAt > Date.now()) {
              timersRef.current[otherId] = setTimeout(() => cancel(otherId, true), req.expiresAt - Date.now());
            }
          });
          setRequests(formattedRequests);
        }
      } catch (error) {
        console.error("Failed to fetch pending requests:", error);
      }
    };

    // Add a small delay to ensure user data is fully loaded
    const timeoutId = setTimeout(fetchPendingRequests, 100);
    return () => clearTimeout(timeoutId);
  }, [user?._id, user?.houseCode]);

  useEffect(() => {
    if (!user?._id) return;
    
    // Import and connect Ably if not already connected
    import("../ablyConfig").then(({ connectAbly, isAblyConnected }) => {
      if (!isAblyConnected()) {
        connectAbly();
      }
    });
    
    channelRef.current = ably.channels.get(`user:payment:${user._id}`);

    const onRequest = ({ data }) => {
      const otherId = data.fromUserId === user._id ? data.toUserId : data.fromUserId;
      setRequests((prev) => ({
        ...prev,
        [otherId]: {
          ...data,
          direction: data.fromUserId === user._id ? "outgoing" : "incoming",
          expiresAt: Date.now() + 60_000,
        },
      }));
      if (data.fromUserId === user._id) {
        timersRef.current[otherId] = setTimeout(() => cancel(otherId, true), 60_000);
      }
    };
    const onClear = ({ data }) => {
      setRequests((prev) => {
        const copy = { ...prev };
        delete copy[data.otherUserId];
        return copy;
      });
    };

    channelRef.current.subscribe("payment:request", onRequest);
    channelRef.current.subscribe("payment:approved", onClear);
    channelRef.current.subscribe("payment:declined", onClear);
    channelRef.current.subscribe("payment:cancelled", onClear);
    return () => {
      try {
        channelRef.current.unsubscribe("payment:request", onRequest);
        channelRef.current.unsubscribe("payment:approved", onClear);
        channelRef.current.unsubscribe("payment:declined", onClear);
        channelRef.current.unsubscribe("payment:cancelled", onClear);
      } catch {}
      Object.values(timersRef.current).forEach(clearTimeout);
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

  // Define cancel before request to avoid TDZ in dependency arrays
  const cancel = useCallback(
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
        await axios.post("/api/payment-approvals/cancel", { requestId: req.id });
      } catch (e) {
        console.error("Cancel failed", e);
      }
    },
    [requests]
  );

  const request = useCallback(
    async (toUserId, itemIds) => {
      const currentUserId = user?._id || (() => { try { return JSON.parse(sessionStorage.getItem('user')||'{}')._id; } catch { return null; } })();
      console.log('[REQUEST] payment request start', { toUserId, itemCount: Array.isArray(itemIds) ? itemIds.length : 'n/a', currentUserIdPresent: !!currentUserId });
      if (!currentUserId || !toUserId || !Array.isArray(itemIds) || itemIds.length === 0) {
        console.log('[BLOCK] request: missing params', { hasUser: !!currentUserId, toUserId, validItems: Array.isArray(itemIds), itemsLen: itemIds?.length });
        return false;
      }
      const existing = requests[toUserId];
      if (existing) {
        if (existing.expiresAt && existing.expiresAt < Date.now()) {
          console.log('[CLEANUP] removing expired existing request before re-request', existing);
          removeExpired(toUserId);
        } else {
          console.log('[BLOCK] request: existing pending request found', existing);
          return false;
        }
      }
      try {
        const { data } = await axios.post("/api/payment-approvals/request", { toUserId, itemIds });
        const expiresAt = Date.now() + 60_000;
        setRequests((prev) => ({
          ...prev,
          [toUserId]: {
            id: data.requestId,
            fromUserId: currentUserId,
            toUserId,
            items: itemIds,
            direction: "outgoing",
            expiresAt,
          },
        }));
        timersRef.current[toUserId] = setTimeout(() => cancel(toUserId, true), 60_000);
        return true;
      } catch (e) {
        console.error("Payment approval request failed", e);
        return false;
      }
    },
    [user?._id, requests, removeExpired, cancel]
  );

  const respond = useCallback(
    async (otherUserId, accept) => {
      const req = requests[otherUserId];
      if (!req) return { success: false, message: "Request not found" };
      if (req.expiresAt < Date.now()) {
        removeExpired(otherUserId);
        return { success: false, message: "Expired" };
      }
      try {
        const { data } = await axios.post("/api/payment-approvals/respond", { requestId: req.id, accept });
        setRequests((prev) => {
          const copy = { ...prev };
          delete copy[otherUserId];
          return copy;
        });
        return { success: true, processed: data.processed };
      } catch (e) {
        console.error("Payment approval respond failed", e);
        return { success: false, message: e.response?.data?.message || "Unknown error" };
      }
    },
    [requests, removeExpired]
  );


  const getTimeRemaining = useCallback(
    (otherUserId) => {
      const req = requests[otherUserId];
      if (!req) return 0;
      if (req.expiresAt < Date.now()) {
        removeExpired(otherUserId);
        return 0;
      }
      const remaining = Math.ceil((req.expiresAt - Date.now()) / 1000);
      console.log(`Payment timer for ${otherUserId}: expiresAt=${req.expiresAt}, now=${Date.now()}, remaining=${remaining}s`);
      return Math.max(0, remaining);
    },
    [requests, removeExpired]
  );

  return (
    <PaymentApprovalContext.Provider
      value={{
        paymentRequests: requests,
        requestPayment: request,
        approvePayment: (otherUserId) => respond(otherUserId, true),
        declinePayment: (otherUserId) => respond(otherUserId, false),
        cancelPaymentRequest: cancel,
        getTimeRemaining,
      }}
    >
      {children}
    </PaymentApprovalContext.Provider>
  );
};


