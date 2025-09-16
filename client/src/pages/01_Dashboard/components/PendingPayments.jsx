import React, { useCallback, useContext, useRef, useEffect, useState } from "react";
import formatCurrency from "../../../utils/formatCurrency";
import classes from "../Dashboard.module.css";
import { PiHandDepositFill } from "react-icons/pi";
import axios from "axios";
import { PaymentApprovalContext } from "../../../contexts/PaymentApprovalContext";
import Tooltip from "../../../components/Tooltip";

const PaymentTimer = ({ memberId, getTimeRemaining, request }) => {
	const [time, setTime] = useState(getTimeRemaining(memberId));
	useEffect(() => {
		const timer = setInterval(() => {
			const t = getTimeRemaining(memberId);
			setTime(t);
			if (t <= 0) {
				clearInterval(timer);
			}
		}, 1000);
		return () => clearInterval(timer);
	}, [memberId, getTimeRemaining]);
	
	if (time <= 0) return null;
	
	const isAllItems = request?.items?.length > 1;
	const itemCount = request?.items?.length || 0;
	
	return (
		<div className={classes.countdownContainer}>
			<div className={classes.countdownIndicator}>
				<div className={classes.countdownCircle}>
					<span className={classes.countdownTime}>{time}</span>
				</div>
			</div>
			<div className={classes.countdownText}>
				<span className={classes.countdownLabel}>
					{isAllItems ? `Paying all ${itemCount} items` : `Paying for 1 item`}
				</span>
				<span className={classes.countdownSubtext}>Awaiting approval</span>
			</div>
		</div>
	);
};

const PendingItem = ({ item, onPay, isSelected = false }) => {
	const [isLoading, setIsLoading] = useState(false);
	const handlePay = async () => {
		setIsLoading(true);
		try {
			await onPay(item._id);
		} finally {
			setTimeout(() => setIsLoading(false), 1000);
		}
	};
	return (
		<li className={`${classes.itemRow} ${isSelected ? classes.selectedItem : ''}`}>
			<span className={classes.itemName}>{item.name}</span>
			<div className={classes.itemDetails}>
				<span className={classes.itemShare}>{formatCurrency(item.share)}</span>
				<span className={classes.itemOfTotal}>/ {formatCurrency(item.price)}</span>
			</div>
			<div className={classes.itemPay}>
				{isSelected ? (
					<div className={classes.selectedIndicator}>
						<div className={classes.selectedDot}></div>
						<span className={classes.selectedText}>Selected</span>
					</div>
				) : (
					<Tooltip content="Pay only this item" position="top">
						<button 
							onClick={() => { console.log("[CLICK] Pay single item", { itemId: item._id, itemName: item.name }); handlePay(); }} 
							className={`${classes.btnIcon} ${isLoading ? classes.loading : ''}`} 
							disabled={isLoading}
							aria-label={`Pay for ${item.name}`}
						>
							<PiHandDepositFill />
						</button>
					</Tooltip>
				)}
			</div>
		</li>
	);
};

const PendingPaymentsCard = ({ memberId, data, onPayItem, onPayAll, selectedItems = [], hasPendingRequest = false }) => {
	const [isLoading, setIsLoading] = useState(false);
	
	// Reset loading state when pending request is cleared
	useEffect(() => {
		if (!hasPendingRequest) {
			setIsLoading(false);
		}
	}, [hasPendingRequest]);
	
	const handlePayAll = async () => {
		setIsLoading(true);
		try {
			await onPayAll(memberId);
		} catch (error) {
			// Only reset loading on error, not on success
			setIsLoading(false);
		}
	};
	
	const isDisabled = isLoading || hasPendingRequest;
	
	return (
		<div className={classes.card}>
			<header className={classes.cardHeader}>
				<h3 className={classes.cardTitle}>{data.memberInfo?.name || "Member"}</h3>
				<Tooltip content={hasPendingRequest ? "Payment request already pending" : "Pay all outstanding items to this member"} position="top">
					<button
						onClick={() => { console.log("[CLICK] Pay all to member", { memberId, memberName: data.memberInfo?.name, itemCount: data.items?.length }); handlePayAll(); }}
						className={`${classes.btnPrimary} ${isLoading ? classes.loading : ''}`}
						disabled={isDisabled}
						aria-label={`Pay all to ${data.memberInfo?.name}`}
					>
						{isLoading ? 'Processing...' : 'Pay All'}
					</button>
				</Tooltip>
			</header>
		<ul className={classes.itemList}>
			{data.items.map((item) => (
				<PendingItem 
					key={item._id} 
					item={item} 
					onPay={onPayItem} 
					isSelected={selectedItems.includes(item._id)}
				/>
			))}
		</ul>
		<footer className={classes.cardFooter}>
			<span>Total Owed</span>
			<span className={classes.cardTotal}>{formatCurrency(data.total)}</span>
		</footer>
	</div>
	);
};

const PendingPayments = ({ paymentsByMember, items, updateItems, fetchItems, user }) => {
	const rollbackRef = useRef(null);
	const { requestPayment, paymentRequests, getTimeRemaining, cancelPaymentRequest } = useContext(PaymentApprovalContext);

	const payItem = useCallback(
		async (itemId) => {
			const currentUserId = user?._id || (() => { try { return JSON.parse(sessionStorage.getItem('user')||'{}')._id; } catch { return null; } })();
			console.log('[ACTION] payItem', { itemId, hasUserId: !!currentUserId });
			const item = items.find((i) => i._id === itemId);
			if (!item) { console.log('[SKIP] payItem: item not found'); return; }
			await requestPayment(item.author.toString(), [itemId]);
		},
		[items, user?._id, requestPayment]
	);

	const payAllToMember = useCallback(
		async (memberId) => {
			const currentUserId = user?._id || (() => { try { return JSON.parse(sessionStorage.getItem('user')||'{}')._id; } catch { return null; } })();
			console.log('[ACTION] payAllToMember', { memberId, hasUserId: !!currentUserId, itemsCount: items?.length });
			const itemIds = items
				.filter(
					(item) =>
						item.author.toString() === memberId &&
						item.members.some((m) => m.userID.toString() === (currentUserId||'').toString() && !m.paid)
				)
				.map((i) => i._id);
			console.log('[DEBUG] payAllToMember computed itemIds', { count: itemIds.length, itemIds });
			if (itemIds.length === 0) { console.log('[SKIP] payAllToMember: no eligible items'); return; }
			const result = await requestPayment(memberId, itemIds);
			console.log('[RESULT] payAllToMember requestPayment returned', result);
		},
		[items, user?._id, requestPayment]
	);

	const paymentEntries = Object.entries(paymentsByMember || {});

	return (
		<section className={classes.panel} aria-labelledby="pending-heading">
			<h2 id="pending-heading" className={classes.panelTitle}>
				Pending Payments
			</h2>
			{paymentEntries.length === 0 ? (
				<p className={classes.empty}>You're all settled up. No pending payments! ✅</p>
			) : (
				<div className={classes.pendingGrid}>
					{paymentEntries.map(([memberId, data]) => {
						const req = paymentRequests?.[memberId];
						const selectedItems = req?.items || [];
						const hasPendingRequest = !!req && req.direction === "outgoing";
						return (
							<div key={memberId}>
								<PendingPaymentsCard
									memberId={memberId}
									data={data}
									onPayItem={payItem}
									onPayAll={payAllToMember}
									selectedItems={selectedItems}
									hasPendingRequest={hasPendingRequest}
								/>
								{req && req.direction === "outgoing" && (
									<div className={classes.awaitingApproval}>
										<PaymentTimer 
											memberId={memberId} 
											getTimeRemaining={getTimeRemaining} 
											request={req}
										/>
										<button className={classes.btnGhost} onClick={() => cancelPaymentRequest(memberId)}>
											Cancel
										</button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
};

export default PendingPayments;
