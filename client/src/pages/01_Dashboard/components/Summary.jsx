import React from "react";
import formatCurrency from "../../../utils/formatCurrency";
import classes from "../Dashboard.module.css";
import { FaSackDollar, FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";

const StatCard = ({ icon, label, value, subtext, "data-type": dataType }) => {
	const isNet = dataType === "net";
	const isPositive = isNet && value >= 0;

	return (
		<div className={classes.statCard} data-type={dataType} data-positive={isPositive}>
			<div className={classes.statIcon}>{icon}</div>
			<div className={classes.statContent}>
				<span className={classes.statLabel}>{label}</span>
				<span className={classes.statValue}>{formatCurrency(value)}</span>
				{subtext && <span className={classes.statSub}>{subtext}</span>}
			</div>
		</div>
	);
};

const Summary = ({ totals }) => {
	return (
		<section className={classes.summaryGrid} aria-label="Financial summary">
			<StatCard
				icon={<FaSackDollar />}
				label="Net Balance"
				value={totals.net}
				subtext={totals.net >= 0 ? "In your favor" : "You owe overall"}
				data-type="net"
			/>
			<StatCard
				icon={<FaArrowTrendUp />}
				label="Owed to You"
				value={totals.owed}
				subtext="From other members"
				data-type="owed"
			/>
			<StatCard
				icon={<FaArrowTrendDown />}
				label="You Owe"
				value={totals.owing}
				subtext="Across all items"
				data-type="owing"
			/>
		</section>
	);
};

export default Summary;
