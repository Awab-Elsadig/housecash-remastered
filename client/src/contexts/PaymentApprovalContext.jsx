import { createContext, useCallback, useEffect, useRef, useState } from "react";
import ably from "../ablyConfig";
import axios from "axios";

export const PaymentApprovalContext = createContext();

export const PaymentApprovalProvider = ({ user, children }) => {
  const [requests, setRequests] = useState({}); // key otherUserId -> { id, items, type, expiresAt, direction }
  const timersRef = useRef({});
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;
    channelRef.current = ably.channels.get(`user:payment:${user._id}`);

    const onRequest = ({ data }) => {
      const otherId = data.fromUserId === user._id ? data.toUserId : data.fromUserId;
      setRequests((prev) => ({
        ...prev,
        [otherId]: {
          ...data,
          direction: data.fromUserId === user._id ? "outgoing" : "incoming",
          expiresAt: Date.now() + 120_000,
        },
      }));
      if (data.fromUserId === user._id) {
        timersRef.current[otherId] = setTimeout(() => cancel(otherId, true), 120_000);
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

  const request = useCallback(
    async (toUserId, itemIds) => {
      if (!user?._id || !toUserId || !Array.isArray(itemIds) || itemIds.length === 0) return false;
      if (requests[toUserId]) return false;
      try {
        const { data } = await axios.post("/api/payment-approvals/request", { toUserId, itemIds });
        const expiresAt = Date.now() + 120_000;
        setRequests((prev) => ({
          ...prev,
          [toUserId]: {
            id: data.requestId,
            fromUserId: user._id,
            toUserId,
            items: itemIds,
            direction: "outgoing",
            expiresAt,
          },
        }));
        timersRef.current[toUserId] = setTimeout(() => cancel(toUserId, true), 120_000);
        return true;
      } catch (e) {
        console.error("Payment approval request failed", e);
        return false;
      }
    },
    [user?._id, requests]
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

  const getTimeRemaining = useCallback(
    (otherUserId) => {
      const req = requests[otherUserId];
      if (!req) return 0;
      if (req.expiresAt < Date.now()) {
        removeExpired(otherUserId);
        return 0;
      }
      return Math.ceil((req.expiresAt - Date.now()) / 1000);
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


