import React, { useContext, useMemo, useEffect, useState } from "react";
import formatCurrency from "../../../utils/formatCurrency";
import classes from "../Dashboard.module.css";
import { PaymentApprovalContext } from "../../../contexts/PaymentApprovalContext";

const OwedItem = ({ item }) => (
	<li className={classes.itemRow}>
		<span className={classes.itemName}>{item.name}</span>
		<div className={classes.itemDetails}>
			<span className={classes.itemShare}>{formatCurrency(item.share)}</span>
			<span className={classes.itemOfTotal}>/ {formatCurrency(item.price)}</span>
		</div>
		<div className={classes.itemPay} />
	</li>
);

const OwedCard = ({ memberId, data, incomingRequest, onApprove, onDecline, timeRemaining }) => (
	<div className={classes.card}>
		<header className={classes.cardHeader}>
			<h3 className={classes.cardTitle}>{data.memberInfo?.name || "Member"}</h3>
		</header>
		<ul className={classes.itemList}>
			{data.items.map((item) => (
				<OwedItem key={item._id} item={item} />
			))}
		</ul>
		<footer className={classes.cardFooter}>
			<span>Total They Owe</span>
			<span className={classes.cardTotal}>{formatCurrency(data.total)}</span>
		</footer>
		{incomingRequest && (
			<div className={classes.settleIncoming}>
				<div>
					<button className={classes.btnPrimary} onClick={() => onApprove(memberId)}>
						Approve <span>({timeRemaining}s)</span>
					</button>
					<button className={classes.btnGhost} onClick={() => onDecline(memberId)}>Decline</button>
				</div>
			</div>
		)}
	</div>
);

const PeopleOweMe = ({ user, items, houseMembers }) => {
	const { paymentRequests, approvePayment, declinePayment, getTimeRemaining } = useContext(PaymentApprovalContext);

	const [tick, setTick] = useState(0);
	useEffect(() => {
		const interval = setInterval(() => setTick((t) => t + 1), 1000);
		return () => clearInterval(interval);
	}, []);

	const owedByMember = useMemo(() => {
		if (!user?._id || !Array.isArray(items) || items.length === 0) return {};
		const myId = user._id.toString();
		const memberMap = new Map((houseMembers || []).map((m) => [m._id?.toString(), m]));
		const store = {};
		for (const it of items) {
			const author = it.author?.toString();
			if (!author || author !== myId) continue;
			if (!it.price || !Array.isArray(it.members) || it.members.length === 0) continue;
			const share = it.price / it.members.length;
			for (const mem of it.members) {
				const pid = mem.userID?.toString();
				if (!pid || pid === myId || mem.paid) continue;
				if (!store[pid]) store[pid] = { memberInfo: memberMap.get(pid) || {}, items: [], total: 0 };
				store[pid].items.push({ _id: it._id, name: it.name, share, price: it.price });
				store[pid].total += share;
			}
		}
		return store;
	}, [user?._id, items, houseMembers]);

	const entries = Object.entries(owedByMember);

	return (
		<section className={`${classes.panel} ${classes.panelPositive} ${classes.stackGap}`} aria-labelledby="owe-me-heading">
			<h2 id="owe-me-heading" className={classes.panelTitle}>
				People Owe Me
			</h2>
			{entries.length === 0 ? (
				<p className={classes.empty}>No one owes you anything right now. 🎉</p>
			) : (
				<div className={classes.pendingGrid}>
					{entries.map(([memberId, data]) => {
						const req = paymentRequests?.[memberId];
						const incoming = req && req.direction === "incoming";
						const remaining = getTimeRemaining(memberId);
						return (
							<OwedCard
								key={memberId}
								memberId={memberId}
								data={data}
								incomingRequest={incoming}
								onApprove={approvePayment}
								onDecline={declinePayment}
								timeRemaining={remaining}
							/>
						);
					})}
				</div>
			)}
		</section>
	);
};

export default PeopleOweMe;


