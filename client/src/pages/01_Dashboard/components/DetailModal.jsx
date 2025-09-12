import React, { useEffect } from "react";
import formatCurrency from "../../../utils/formatCurrency";
import classes from "../Dashboard.module.css";
import { FiX } from "react-icons/fi";

const DetailModal = ({ isOpen, onClose, memberId, houseMembers, bilateral, detailItems }) => {
	useEffect(() => {
		const handleEsc = (event) => {
			if (event.key === "Escape") {
				onClose();
			}
		};
		if (isOpen) {
			window.addEventListener("keydown", handleEsc);
		}
		return () => {
			window.removeEventListener("keydown", handleEsc);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const member = houseMembers.find((m) => m._id.toString() === memberId);
	const bilateralData = bilateral[memberId] || { theyOwe: 0, youOwe: 0, total: 0 };
	const net = (bilateralData.theyOwe || 0) - (bilateralData.youOwe || 0);

	return (
		<div className={classes.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
			<div className={classes.modal} onClick={(e) => e.stopPropagation()}>
				<header className={classes.modalHeader}>
					<h3 className={classes.modalTitle}>Details with {member?.name || "Member"}</h3>
					<button className={classes.modalClose} onClick={onClose} aria-label="Close modal">
						<FiX />
					</button>
				</header>
				<div className={classes.modalSummary}>
					<div className={classes.modalStat}>
						<span>Net Balance</span>
						<strong className={net < 0 ? classes.negative : classes.positive}>
							{formatCurrency(net)}
						</strong>
					</div>
					<div className={classes.modalStat}>
						<span>They Owe You</span>
						<strong className={classes.positive}>{formatCurrency(bilateralData.theyOwe)}</strong>
					</div>
					<div className={classes.modalStat}>
						<span>You Owe Them</span>
						<strong className={classes.negative}>{formatCurrency(bilateralData.youOwe)}</strong>
					</div>
				</div>
				<ul className={classes.modalItemList}>
					{detailItems.length === 0 ? (
						<li className={classes.empty}>No direct unsettled items with this member.</li>
					) : (
						detailItems.map((item) => (
							<li key={item.id} className={classes.modalItem} data-direction={item.direction}>
								<span className={classes.itemName}>{item.name}</span>
								<div className={classes.modalItemDetails}>
									<span className={classes.itemShare} data-direction={item.direction}>
										{formatCurrency(item.share)}
									</span>
									<span className={classes.itemDirection}>
										{item.direction === "theyOwe" ? "Owed to you" : "You owe"}
									</span>
								</div>
							</li>
						))
					)}
				</ul>
			</div>
		</div>
	);
};

export default DetailModal;
