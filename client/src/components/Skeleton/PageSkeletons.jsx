import { SkeletonCard, SkeletonStats, SkeletonTable, Skeleton } from "../Skeleton";
import classes from "./PageSkeletons.module.css";

/**
 * Simple page skeleton layouts using animated skeleton components
 * All layouts are responsive and adapt to mobile screens
 */

// Dashboard Page Skeleton - Three-column layout matching Dashboard structure
export const DashboardSkeleton = () => (
	<div className={classes.dashboardSkeleton}>
		<div className={classes.leftColumn}>
			<SkeletonCard />
			<SkeletonCard />
			<SkeletonCard />
		</div>
		<div className={classes.middleColumn}>
			<SkeletonCard />
			<SkeletonCard />
			<SkeletonCard />
		</div>
		<div className={classes.rightColumn}>
			<SkeletonCard />
		</div>
	</div>
);

// Expenses Page Skeleton - Two-column with skeleton components
export const ExpensesSkeleton = () => (
	<div className={classes.expensesSkeleton}>
		<SkeletonTable rows={8} columns={5} />
		<SkeletonStats count={5} />
	</div>
);

// Payment History Page Skeleton - Two-column with skeleton components
export const PaymentHistorySkeleton = () => (
	<div className={classes.paymentHistorySkeleton}>
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<SkeletonCard />
			<SkeletonCard />
			<SkeletonCard />
			<SkeletonCard />
		</div>
		<SkeletonStats count={4} />
	</div>
);

// Settings Page Skeleton - Two-column with skeleton components
export const SettingsSkeleton = () => (
	<div className={classes.settingsSkeleton}>
		<div className={classes.settingsGrid}>
			<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
				<SkeletonCard />
				<SkeletonCard />
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
				<SkeletonCard />
				<SkeletonCard />
				<SkeletonCard />
			</div>
		</div>
	</div>
);
