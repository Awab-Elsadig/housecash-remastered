import styles from "./Skeleton.module.css";

const Skeleton = ({ variant = "rectangular", width = "100%", height = "1rem", className = "", count = 1 }) => {
	const skeletonElements = Array.from({ length: count }, (_, index) => (
		<div key={index} className={`${styles.skeleton} ${styles[variant]} ${className}`} style={{ width, height }} />
	));

	return count === 1 ? skeletonElements[0] : <>{skeletonElements}</>;
};

// Pre-built skeleton components for common use cases
export const SkeletonCard = ({ className = "" }) => (
	<div className={`${styles.skeletonCard} ${className}`}>
		<Skeleton variant="circular" width="3rem" height="3rem" />
		<div className={styles.skeletonContent}>
			<Skeleton height="1.2rem" width="70%" />
			<Skeleton height="0.9rem" width="50%" />
		</div>
	</div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
	<div className={styles.skeletonTable}>
		{Array.from({ length: rows }, (_, rowIndex) => (
			<div key={rowIndex} className={styles.skeletonRow}>
				{Array.from({ length: columns }, (_, colIndex) => (
					<Skeleton key={colIndex} height="1rem" />
				))}
			</div>
		))}
	</div>
);

export const SkeletonStats = ({ count = 3 }) => (
	<div className={styles.skeletonStats}>
		{Array.from({ length: count }, (_, index) => (
			<div key={index} className={styles.skeletonStatCard}>
				<Skeleton variant="circular" width="2.5rem" height="2.5rem" />
				<div className={styles.skeletonStatContent}>
					<Skeleton height="1.5rem" width="60%" />
					<Skeleton height="0.8rem" width="40%" />
				</div>
			</div>
		))}
	</div>
);

export default Skeleton;
