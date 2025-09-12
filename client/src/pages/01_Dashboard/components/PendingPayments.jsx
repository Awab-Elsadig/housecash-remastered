import React, { useCallback, useContext, useRef, useEffect, useState } from "react";
import formatCurrency from "../../../utils/formatCurrency";
import classes from "../Dashboard.module.css";
import { PiHandDepositFill } from "react-icons/pi";
import axios from "axios";
import { PaymentApprovalContext } from "../../../contexts/PaymentApprovalContext";

const PaymentTimer = ({ memberId, getTimeRemaining }) => {
	const [time, setTime] = useState(getTimeRemaining(memberId));
	useEffect(() => {
		const timer = setInterval(() => {
			const t = getTimeRemaining(memberId);
			setTime(t);
			if (t <= 0) clearInterval(timer);
		}, 1000);
		return () => clearInterval(timer);
	}, [memberId, getTimeRemaining]);
	if (time <= 0) return null;
	return <span>({time}s)</span>;
};

const PendingItem = ({ item, onPay }) => (
	<li className={classes.itemRow}>
		<span className={classes.itemName}>{item.name}</span>
		<div className={classes.itemDetails}>
			<span className={classes.itemShare}>{formatCurrency(item.share)}</span>
			<span className={classes.itemOfTotal}>/ {formatCurrency(item.price)}</span>
		</div>
		<div className={classes.itemPay}>
			<button onClick={() => onPay(item._id)} className={classes.btnIcon} aria-label={`Pay for ${item.name}`} title="Pay only this item">
				<PiHandDepositFill />
			</button>
		</div>
	</li>
);

const PendingPaymentsCard = ({ memberId, data, onPayItem, onPayAll }) => (
	<div className={classes.card}>
		<header className={classes.cardHeader}>
			<h3 className={classes.cardTitle}>{data.memberInfo?.name || "Member"}</h3>
			<button
				onClick={() => onPayAll(memberId)}
				className={classes.btnPrimary}
				aria-label={`Pay all to ${data.memberInfo?.name}`}
				title="Pay all outstanding items to this member"
			>
				Pay All
			</button>
		</header>
		<ul className={classes.itemList}>
			{data.items.map((item) => (
				<PendingItem key={item._id} item={item} onPay={onPayItem} />
			))}
		</ul>
		<footer className={classes.cardFooter}>
			<span>Total Owed</span>
			<span className={classes.cardTotal}>{formatCurrency(data.total)}</span>
		</footer>
	</div>
);

const PendingPayments = ({ paymentsByMember, items, updateItems, fetchItems, user }) => {
	const rollbackRef = useRef(null);
	const { requestPayment, paymentRequests, getTimeRemaining, cancelPaymentRequest } = useContext(PaymentApprovalContext);

	const payItem = useCallback(
		async (itemId) => {
			if (!user?._id) return;
			const item = items.find((i) => i._id === itemId);
			if (!item) return;
			await requestPayment(item.author.toString(), [itemId]);
		},
		[items, user?._id, requestPayment]
	);

	const payAllToMember = useCallback(
		async (memberId) => {
			if (!user?._id) return;
			const itemIds = items
				.filter(
					(item) =>
						item.author.toString() === memberId &&
						item.members.some((m) => m.userID.toString() === user._id.toString() && !m.paid)
				)
				.map((i) => i._id);
			if (itemIds.length === 0) return;
			await requestPayment(memberId, itemIds);
		},
		[items, user?._id, requestPayment]
	);

	const paymentEntries = Object.entries(paymentsByMember);

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
						return (
							<div key={memberId}>
								<PendingPaymentsCard
									memberId={memberId}
									data={data}
									onPayItem={payItem}
									onPayAll={payAllToMember}
								/>
								{req && req.direction === "outgoing" && (
									<p className={classes.empty}>
										Awaiting approval <PaymentTimer memberId={memberId} getTimeRemaining={getTimeRemaining} />
										<button className={classes.btnGhost} onClick={() => cancelPaymentRequest(memberId)} style={{ marginLeft: 8 }}>
											Cancel
										</button>
									</p>
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
