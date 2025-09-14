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

const Dashboard = () => {
	useEffect(() => {
		document.title = "Dashboard - HouseCash";
	}, []);

	const { user, houseMembers, items, fetchItems, updateItems, fetchCurrentUser } = useUser();
	const settlementContext = useSettlement();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const { paymentsByMember, netPerMember, bilateral, totals } = useDashboardData(
		user?._id?.toString(),
		items,
		houseMembers
	);

	const dataReady =
		user &&
		houseMembers &&
		houseMembers.length > 0 &&
		items !== null &&
		items !== undefined;

	const isLoading = useDataLoading(dataReady);

	useEffect(() => {
		if (!user?.houseCode) return;
		const channel = ably.channels.get(`house:${user.houseCode}`);
		const refresh = () => fetchItems();
		["fetchUpdate", "itemUpdate", "paymentNotification"].forEach((evt) => channel.subscribe(evt, refresh));
		return () =>
			["fetchUpdate", "itemUpdate", "paymentNotification"].forEach((evt) => channel.unsubscribe(evt, refresh));
	}, [fetchItems, user?.houseCode]);

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
				<Summary totals={totals} />

				<div className={classes.mainContent}>
					<section aria-label="Net balances">
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
					<section aria-label="Pending payments">
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
