import React, { useEffect, useCallback, useState, useMemo } from "react";
import classes from "./Dashboard.module.css";
import { useUser } from "../../hooks/useUser";
import { useDataLoading } from "../../hooks/useLoading";
import { DashboardSkeleton } from "../../components/Skeleton";
import { useSettlement } from "../../contexts/useSettlement";
import ably from "../../ablyConfig";
import { useDashboardData, buildDetailItems } from "../../hooks/useDashboardData";
import Summary from "./components/Summary";
import NetBalances from "./components/NetBalances";
import PendingPayments from "./components/PendingPayments";
import DetailModal from "./components/DetailModal";
import PeopleOweMe from "./components/PeopleOweMe";
import RefreshButton from "../../components/RefreshButton";
import AddItemButton from "../../components/AddItemButton/AddItemButton";
import { useImpersonationContext } from "../../hooks/useImpersonationContext";

const Dashboard = () => {
	useEffect(() => {
		document.title = "Dashboard - HouseCash";
	}, []);

	const { user, houseMembers, items, fetchItems, updateItems, fetchCurrentUser, refreshTrigger } = useUser();
	const { isImpersonating } = useImpersonationContext();
	const settlementContext = useSettlement();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const { paymentsByMember, netPerMember, bilateral, totals } = useDashboardData(
		user?._id?.toString(),
		items,
		houseMembers
	);

	// Force refresh when impersonation changes
	useEffect(() => {
		if (isImpersonating && user?._id && user?.houseCode) {
			console.log("✓ Dashboard: Impersonation detected, refreshing items");
			// Add a small delay to ensure user data is fully updated
			setTimeout(() => {
				fetchItems();
			}, 100);
		}
	}, [isImpersonating, refreshTrigger, user?._id, user?.houseCode, fetchItems]);

	const dataReady =
		user &&
		houseMembers &&
		houseMembers.length > 0 &&
		items !== null &&
		items !== undefined;

	// Add impersonation-specific loading state
	const [isImpersonationLoading, setIsImpersonationLoading] = useState(false);
	
	// Track when impersonation data is being loaded
	useEffect(() => {
		if (isImpersonating) {
			setIsImpersonationLoading(true);
			// Set a timeout to clear loading state if data doesn't load
			const timeout = setTimeout(() => {
				setIsImpersonationLoading(false);
			}, 5000); // 5 second timeout
			
			return () => clearTimeout(timeout);
		} else {
			setIsImpersonationLoading(false);
		}
	}, [isImpersonating]);

	// Clear impersonation loading when data is ready
	useEffect(() => {
		if (isImpersonationLoading && dataReady) {
			setIsImpersonationLoading(false);
		}
	}, [isImpersonationLoading, dataReady]);

	const isLoading = useDataLoading(dataReady) || isImpersonationLoading;

	useEffect(() => {
		if (!user?.houseCode) return;

		// Import and connect Ably if not already connected
		import("../../ablyConfig").then(({ connectAbly, isAblyConnected }) => {
			if (!isAblyConnected()) {
				connectAbly();
			}
		});

		// Subscribe to house channel for real-time updates
		const channel = ably.channels.get(`house:${user.houseCode}`);
		const refresh = () => fetchItems();
		["fetchUpdate", "itemUpdate", "paymentNotification"].forEach((evt) => channel.subscribe(evt, refresh));
		return () =>
			["fetchUpdate", "itemUpdate", "paymentNotification"].forEach((evt) => channel.unsubscribe(evt, refresh));
	}, [fetchItems, user?.houseCode]);

	// Listen for navigation-like data loading events
	useEffect(() => {
		const handleNavigateToPage = (event) => {
			const { forceRefresh } = event.detail || {};
			console.log("✓ Dashboard: Starting navigation-like data loading", { forceRefresh });
			
			// Step 1: Load items from cache first (like navigation does)
			const cachedItems = sessionStorage.getItem("items");
			if (cachedItems && !forceRefresh) {
				try {
					const itemsData = JSON.parse(cachedItems);
					updateItems(itemsData);
					console.log("✓ Dashboard: Loaded items from cache:", itemsData.length, "items");
				} catch (e) {
					console.error("Failed to parse cached items:", e);
				}
			}
			
			// Step 2: Fetch fresh items from server (like navigation does)
			setTimeout(() => {
				console.log("✓ Dashboard: Fetching fresh items from server");
				fetchItems();
			}, 200);
		};

		const handleForceDataRefresh = () => {
			console.log("✓ Dashboard: Force refreshing items");
			setTimeout(() => {
				fetchItems();
			}, 200);
		};

		window.addEventListener('navigateToPage', handleNavigateToPage);
		window.addEventListener('forceDataRefresh', handleForceDataRefresh);
		return () => {
			window.removeEventListener('navigateToPage', handleNavigateToPage);
			window.removeEventListener('forceDataRefresh', handleForceDataRefresh);
		};
	}, [fetchItems, updateItems]);

	const [detailMemberId, setDetailMemberId] = useState(null);
	const closeDetail = useCallback(() => setDetailMemberId(null), []);

	// Refresh function
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			// Refresh user data and house members
			await fetchCurrentUser();
			// Refresh items
			await fetchItems();
		} catch (error) {
			console.error("Error refreshing dashboard data:", error);
		} finally {
			setIsRefreshing(false);
		}
	}, [fetchCurrentUser, fetchItems]);

	const detailItems = useMemo(
		() => buildDetailItems(user?._id?.toString(), detailMemberId, items),
		[detailMemberId, items, user?._id]
	);

	if (isLoading || !user) {
		return (
			<main className={classes.dashboard} role="main" aria-busy="true" aria-live="polite">
				<DashboardSkeleton />
			</main>
		);
	}

	return (
		<>
			<main className={classes.dashboard} role="main">
				<Summary totals={totals} key={`summary-${user?._id}-${refreshTrigger}`} />

				<div className={classes.mainContent}>
					<section aria-label="Net balances" key={`net-balances-${user?._id}-${refreshTrigger}`}>
						<NetBalances
							netPerMember={netPerMember}
							houseMembers={houseMembers}
							bilateral={bilateral}
							setDetailMemberId={setDetailMemberId}
							settlementContext={settlementContext}
							user={user}
							items={items}
						/>
						<PeopleOweMe user={user} items={items} houseMembers={houseMembers} />
					</section>
					<section aria-label="Pending payments" key={`pending-payments-${user?._id}-${refreshTrigger}`}>
						<PendingPayments
							paymentsByMember={paymentsByMember}
							updateItems={updateItems}
							items={items}
							fetchItems={fetchItems}
							user={user}
						/>
					</section>
				</div>
			</main>
			
			{/* Floating Action Buttons */}
			<div className={classes.floatingActionButtons}>
				<div className={classes.mobileOnly}>
					<AddItemButton />
				</div>
				<RefreshButton 
					onRefresh={handleRefresh} 
					loading={isRefreshing}
					size="small"
				/>
			</div>
			
			{detailMemberId && (
				<DetailModal
					isOpen={!!detailMemberId}
					onClose={closeDetail}
					memberId={detailMemberId}
					houseMembers={houseMembers}
					bilateral={bilateral}
					detailItems={detailItems}
				/>
			)}
		</>
	);
};

export default Dashboard;
