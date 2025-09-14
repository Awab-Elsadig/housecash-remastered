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
import usePageRefresh from "../../hooks/usePageRefresh";
import axios from "axios";

const Dashboard = () => {
	useEffect(() => {
		document.title = "Dashboard - HouseCash";
	}, []);

	const { user, houseMembers, items, fetchItems, updateItems, fetchCurrentUser } = useUser();
	const settlementContext = useSettlement();
	const [isRefreshing, setIsRefreshing] = useState(false);
	
	// Debug states for iPhone troubleshooting
	const [debugInfo, setDebugInfo] = useState({
		showDebug: true,
		authStatus: "Checking...",
		lastCheck: null,
		errorDetails: null,
		userAgent: navigator.userAgent,
		cookies: document.cookie,
		userData: null,
		houseMembersData: null,
		itemsData: null
	});
	
	// Error state to catch crashes
	const [hasError, setHasError] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	
	// Loading timeout state
	const [loadingTimeout, setLoadingTimeout] = useState(false);

	// Wrap dashboard data calculation in try-catch
	let paymentsByMember, netPerMember, bilateral, totals;
	let dataReady, isLoading;
	
	try {
		const dashboardData = useDashboardData(
			user?._id?.toString(),
			items,
			houseMembers
		);
		
		paymentsByMember = dashboardData.paymentsByMember;
		netPerMember = dashboardData.netPerMember;
		bilateral = dashboardData.bilateral;
		totals = dashboardData.totals;

		dataReady =
			user &&
			houseMembers &&
			houseMembers.length > 0 &&
			items !== null &&
			items !== undefined;

		isLoading = useDataLoading(dataReady);
	} catch (error) {
		console.error("Dashboard data calculation error:", error);
		setHasError(true);
		setErrorMessage(`Dashboard data error: ${error.message}`);
		
		// Set default values to prevent crashes
		paymentsByMember = [];
		netPerMember = [];
		bilateral = [];
		totals = { totalOwed: 0, totalOwing: 0, netBalance: 0 };
		dataReady = false;
		isLoading = false;
	}

	// Function to check authentication status
	const checkAuthStatus = async () => {
		try {
			setDebugInfo(prev => ({
				...prev,
				authStatus: "Checking authentication status...",
				errorDetails: null,
				lastCheck: new Date().toISOString()
			}));
			
			const response = await axios.get("/api/users/me", { 
				withCredentials: true,
				timeout: 10000,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			});
			
			if (response.status === 200 && response.data) {
				setDebugInfo(prev => ({
					...prev,
					authStatus: "✅ AUTHENTICATED - User is logged in",
					errorDetails: null,
					userData: response.data,
					cookies: document.cookie
				}));
			} else {
				setDebugInfo(prev => ({
					...prev,
					authStatus: "❌ NOT AUTHENTICATED - No valid session",
					errorDetails: `Status: ${response.status}`
				}));
			}
		} catch (error) {
			setDebugInfo(prev => ({
				...prev,
				authStatus: "❌ AUTHENTICATION CHECK FAILED",
				errorDetails: `Error: ${error.message}, Code: ${error.code}, Status: ${error.response?.status}`
			}));
		}
	};

	// Update debug info when data changes
	useEffect(() => {
		setDebugInfo(prev => ({
			...prev,
			userData: user,
			houseMembersData: houseMembers,
			itemsData: items,
			cookies: document.cookie
		}));
	}, [user, houseMembers, items]);

	// Loading timeout effect
	useEffect(() => {
		if (isLoading) {
			console.log('Dashboard: Starting loading timeout timer');
			const timeout = setTimeout(() => {
				console.log('Dashboard: Loading timeout reached');
				setLoadingTimeout(true);
			}, 10000); // 10 second timeout

			return () => {
				clearTimeout(timeout);
			};
		} else {
			setLoadingTimeout(false);
		}
	}, [isLoading]);

	// Prevent automatic refreshing or navigation back
	useEffect(() => {
		// Disable browser back button
		const handlePopState = (event) => {
			event.preventDefault();
			window.history.pushState(null, '', window.location.href);
		};

		// Disable page refresh
		const handleBeforeUnload = (event) => {
			event.preventDefault();
			event.returnValue = '';
		};

		// Disable pull-to-refresh on mobile
		const handleTouchStart = (event) => {
			if (event.touches.length > 1) {
				event.preventDefault();
			}
		};

		const handleTouchMove = (event) => {
			if (event.touches.length > 1) {
				event.preventDefault();
			}
		};

		// Add event listeners
		window.addEventListener('popstate', handlePopState);
		window.addEventListener('beforeunload', handleBeforeUnload);
		document.addEventListener('touchstart', handleTouchStart, { passive: false });
		document.addEventListener('touchmove', handleTouchMove, { passive: false });

		// Push initial state to prevent back navigation
		window.history.pushState(null, '', window.location.href);

		// Cleanup
		return () => {
			window.removeEventListener('popstate', handlePopState);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('touchstart', handleTouchStart);
			document.removeEventListener('touchmove', handleTouchMove);
		};
	}, []);

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

	// Register refresh function with the global refresh system
	usePageRefresh(handleRefresh, 'dashboard');

	const detailItems = useMemo(
		() => buildDetailItems(user?._id?.toString(), detailMemberId, items),
		[detailMemberId, items, user?._id]
	);

	// Show error screen if there's a crash
	if (hasError) {
		return (
			<main className={classes.dashboard} role="main" style={{ padding: '20px' }}>
				<div style={{
					backgroundColor: '#1a1a1a',
					border: '3px solid #ff0000',
					borderRadius: '12px',
					padding: '20px',
					fontSize: '16px',
					fontFamily: 'Courier New, monospace',
					color: '#ff0000',
					textAlign: 'center'
				}}>
					<h2 style={{ color: '#ff0000', marginBottom: '20px' }}>
						❌ DASHBOARD CRASH DETECTED
					</h2>
					<div style={{ marginBottom: '20px' }}>
						<strong>Error:</strong> {errorMessage}
					</div>
					<div style={{ marginBottom: '20px' }}>
						<strong>User:</strong> {user ? '✅ Loaded' : '❌ Not loaded'}
					</div>
					<div style={{ marginBottom: '20px' }}>
						<strong>House Members:</strong> {houseMembers?.length || 0}
					</div>
					<div style={{ marginBottom: '20px' }}>
						<strong>Items:</strong> {items?.length || 0}
					</div>
					<button 
						onClick={() => {
							setHasError(false);
							setErrorMessage(null);
							window.location.reload();
						}}
						style={{
							padding: '12px 24px',
							backgroundColor: '#ff0000',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '16px',
							fontWeight: 'bold'
						}}
					>
						🔄 Reload Page
					</button>
				</div>
			</main>
		);
	}

	if (isLoading || !user || loadingTimeout) {
		return (
			<main className={classes.dashboard} role="main" aria-busy="true" aria-live="polite">
				<DashboardSkeleton />
				
				{/* Debug Panel - Always show during loading */}
				<div style={{
					position: 'fixed',
					bottom: '20px',
					right: '20px',
					width: '350px',
					maxHeight: '70vh',
					overflow: 'auto',
					backgroundColor: '#1a1a1a',
					border: '3px solid #ff6600',
					borderRadius: '12px',
					padding: '20px',
					fontSize: '14px',
					fontFamily: 'Courier New, monospace',
					color: '#ff6600',
					boxShadow: '0 4px 20px rgba(255, 102, 0, 0.3)',
					zIndex: 9999
				}}>
					<h4 style={{ 
						margin: '0 0 15px 0', 
						color: '#ff6600', 
						fontSize: '16px',
						textAlign: 'center',
						borderBottom: '2px solid #ff6600',
						paddingBottom: '8px'
					}}>
						🔍 LOADING DEBUG
					</h4>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>LOADING STATUS:</strong> 
						<span style={{ color: loadingTimeout ? '#ff0000' : '#ff6600' }}>
							{loadingTimeout ? '⏰ TIMEOUT!' : isLoading ? 'Loading...' : 'Not loading'}
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>USER:</strong> 
						<span style={{ color: user ? '#00ff00' : '#ff0000' }}>
							{user ? '✅ Loaded' : '❌ Not loaded'}
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>HOUSE MEMBERS:</strong> 
						<span style={{ color: '#ff6600' }}>
							{houseMembers?.length || 0} members
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>ITEMS:</strong> 
						<span style={{ color: '#ff6600' }}>
							{items?.length || 0} items
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>DATA READY:</strong> 
						<span style={{ color: dataReady ? '#00ff00' : '#ff0000' }}>
							{dataReady ? 'YES' : 'NO'}
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #ff6600'
					}}>
						<strong style={{ color: '#ffff00' }}>COOKIES:</strong> 
						<div style={{ 
							backgroundColor: '#000', 
							padding: '6px', 
							borderRadius: '4px', 
							marginTop: '4px',
							fontSize: '10px',
							color: document.cookie ? '#ff6600' : '#ff6666',
							border: '1px solid #ff6600',
							wordBreak: 'break-all',
							maxHeight: '60px',
							overflow: 'auto'
						}}>
							{document.cookie || 'No cookies found'}
						</div>
					</div>
					
					<div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
						<button 
							onClick={() => {
								console.log('Force reload dashboard data');
								fetchCurrentUser();
								fetchItems();
							}}
							style={{
								padding: '8px 12px',
								backgroundColor: '#007bff',
								color: 'white',
								border: '2px solid #007bff',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px',
								fontWeight: 'bold',
								width: '100%'
							}}
						>
							🔄 Force Reload Data
						</button>
						
						<button 
							onClick={checkAuthStatus}
							style={{
								padding: '8px 12px',
								backgroundColor: '#28a745',
								color: 'white',
								border: '2px solid #28a745',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px',
								fontWeight: 'bold',
								width: '100%'
							}}
						>
							🔍 Check Auth Status
						</button>
						
						<button 
							onClick={() => {
								console.log('Bypass loading and show dashboard');
								setLoadingTimeout(false);
								// Force bypass loading state
								window.location.reload();
							}}
							style={{
								padding: '8px 12px',
								backgroundColor: '#ff6600',
								color: 'white',
								border: '2px solid #ff6600',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px',
								fontWeight: 'bold',
								width: '100%'
							}}
						>
							🚀 Bypass Loading
						</button>
					</div>
				</div>
			</main>
		);
	}

	// Wrap main render in try-catch
	try {
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
			
			{/* Debug Panel - Temporary for iPhone troubleshooting */}
			{debugInfo.showDebug && (
				<div style={{
					position: 'fixed',
					bottom: '20px',
					right: '20px',
					width: '350px',
					maxHeight: '70vh',
					overflow: 'auto',
					backgroundColor: '#1a1a1a',
					border: '3px solid #00bfff',
					borderRadius: '12px',
					padding: '20px',
					fontSize: '14px',
					fontFamily: 'Courier New, monospace',
					color: '#00bfff',
					boxShadow: '0 4px 20px rgba(0, 191, 255, 0.3)',
					zIndex: 9999
				}}>
					<h4 style={{ 
						margin: '0 0 15px 0', 
						color: '#00bfff', 
						fontSize: '16px',
						textAlign: 'center',
						borderBottom: '2px solid #00bfff',
						paddingBottom: '8px'
					}}>
						🔍 DASHBOARD DEBUG
					</h4>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #00bfff'
					}}>
						<strong style={{ color: '#ffff00' }}>AUTH STATUS:</strong> 
						<span style={{ 
							color: debugInfo.authStatus.includes('✅') ? '#00ff00' : 
								   debugInfo.authStatus.includes('❌') ? '#ff0000' : '#00bfff'
						}}>
							{debugInfo.authStatus}
						</span>
					</div>
					
					{debugInfo.errorDetails && (
						<div style={{ 
							marginBottom: '12px',
							padding: '8px',
							backgroundColor: '#000',
							borderRadius: '6px',
							border: '1px solid #ff0000'
						}}>
							<strong style={{ color: '#ff0000' }}>ERROR:</strong> 
							<div style={{ 
								backgroundColor: '#000', 
								padding: '6px', 
								borderRadius: '4px', 
								marginTop: '4px',
								wordBreak: 'break-all',
								fontSize: '12px',
								color: '#ff6666',
								border: '1px solid #ff0000',
								maxHeight: '100px',
								overflow: 'auto'
							}}>
								{debugInfo.errorDetails}
							</div>
						</div>
					)}
					
					<div style={{ 
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '8px',
						marginBottom: '12px'
					}}>
						<div style={{
							padding: '6px',
							backgroundColor: '#000',
							borderRadius: '4px',
							border: '1px solid #00bfff'
						}}>
							<strong style={{ color: '#ffff00', fontSize: '12px' }}>USER:</strong> 
							<span style={{ color: '#00bfff', fontSize: '12px' }}>
								{user ? '✅' : '❌'}
							</span>
						</div>
						
						<div style={{
							padding: '6px',
							backgroundColor: '#000',
							borderRadius: '4px',
							border: '1px solid #00bfff'
						}}>
							<strong style={{ color: '#ffff00', fontSize: '12px' }}>MEMBERS:</strong> 
							<span style={{ color: '#00bfff', fontSize: '12px' }}>
								{houseMembers?.length || 0}
							</span>
						</div>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #00bfff'
					}}>
						<strong style={{ color: '#ffff00' }}>ITEMS:</strong> 
						<span style={{ color: '#00bfff', fontSize: '12px' }}>
							{items?.length || 0} items
						</span>
					</div>
					
					<div style={{ 
						marginBottom: '12px',
						padding: '8px',
						backgroundColor: '#000',
						borderRadius: '6px',
						border: '1px solid #00bfff'
					}}>
						<strong style={{ color: '#ffff00' }}>COOKIES:</strong> 
						<div style={{ 
							backgroundColor: '#000', 
							padding: '6px', 
							borderRadius: '4px', 
							marginTop: '4px',
							fontSize: '10px',
							color: debugInfo.cookies ? '#00bfff' : '#ff6666',
							border: '1px solid #00bfff',
							wordBreak: 'break-all',
							maxHeight: '60px',
							overflow: 'auto'
						}}>
							{debugInfo.cookies || 'No cookies found'}
						</div>
					</div>
					
					<div style={{ 
						display: 'flex',
						gap: '8px',
						justifyContent: 'center'
					}}>
						<button 
							onClick={checkAuthStatus}
							style={{
								padding: '8px 12px',
								backgroundColor: '#007bff',
								color: 'white',
								border: '2px solid #007bff',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px',
								fontWeight: 'bold'
							}}
						>
							🔍 Check Auth
						</button>
						
						<button 
							onClick={() => setDebugInfo(prev => ({ ...prev, showDebug: false }))}
							style={{
								padding: '8px 12px',
								backgroundColor: '#6c757d',
								color: 'white',
								border: '2px solid #6c757d',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px',
								fontWeight: 'bold'
							}}
						>
							👁️ Hide
						</button>
					</div>
				</div>
			)}
			
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
	} catch (error) {
		console.error("Dashboard render error:", error);
		setHasError(true);
		setErrorMessage(`Render error: ${error.message}`);
		
		// Return error screen
		return (
			<main className={classes.dashboard} role="main" style={{ padding: '20px' }}>
				<div style={{
					backgroundColor: '#1a1a1a',
					border: '3px solid #ff0000',
					borderRadius: '12px',
					padding: '20px',
					fontSize: '16px',
					fontFamily: 'Courier New, monospace',
					color: '#ff0000',
					textAlign: 'center'
				}}>
					<h2 style={{ color: '#ff0000', marginBottom: '20px' }}>
						❌ DASHBOARD RENDER CRASH
					</h2>
					<div style={{ marginBottom: '20px' }}>
						<strong>Error:</strong> {error.message}
					</div>
					<div style={{ marginBottom: '20px' }}>
						<strong>Stack:</strong> 
						<div style={{ 
							backgroundColor: '#000', 
							padding: '10px', 
							borderRadius: '4px', 
							marginTop: '5px',
							fontSize: '12px',
							color: '#ff6666',
							wordBreak: 'break-all',
							maxHeight: '200px',
							overflow: 'auto'
						}}>
							{error.stack}
						</div>
					</div>
					<button 
						onClick={() => {
							setHasError(false);
							setErrorMessage(null);
							window.location.reload();
						}}
						style={{
							padding: '12px 24px',
							backgroundColor: '#ff0000',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '16px',
							fontWeight: 'bold'
						}}
					>
						🔄 Reload Page
					</button>
				</div>
			</main>
		);
	}
};

export default Dashboard;
