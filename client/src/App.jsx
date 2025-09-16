import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRouts";
import Login from "./pages/00_Login/Login";
import "./index.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header/Header";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { SettlementProvider } from "./contexts/SettlementContext";
import { PaymentApprovalProvider } from "./contexts/PaymentApprovalContext";
import { RefreshProvider } from "./contexts/RefreshContext";
import { useUser } from "./hooks/useUser";
import RouteProtection from "./components/RouteProtection";
import SwipeRefreshWrapper from "./components/SwipeRefreshWrapper";
import StopImpersonationFab from "./components/StopImpersonationFab/StopImpersonationFab";
import ImpersonationBanner from "./components/ImpersonationBanner/ImpersonationBanner";
import { useImpersonationContext } from "./hooks/useImpersonationContext";

function SettlementWrapper({ children }) {
	const { user } = useUser();
	return (
		<SettlementProvider user={user}>
			<PaymentApprovalProvider user={user}>
				<RefreshProvider>
					{children}
				</RefreshProvider>
			</PaymentApprovalProvider>
		</SettlementProvider>
	);
}



function AppLayout({ isMobileMenuOpen, setIsMobileMenuOpen, toggleMobileMenu }) {
	const location = useLocation();
	const { user } = useUser();
	const { isImpersonating, impersonationData } = useImpersonationContext();
	const isActuallyImpersonating =
		isImpersonating &&
		impersonationData &&
		impersonationData.impersonatedUserId &&
		impersonationData.originalAdminId &&
		impersonationData.impersonatedUserId !== impersonationData.originalAdminId;
	return (
		<div className="app">
			{/* Desktop Impersonation Banner */}
			<ImpersonationBanner />
			
			<Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
			{isMobileMenuOpen && (
				<div
					className="mobile-backdrop"
					onClick={() => setIsMobileMenuOpen(false)}
					aria-hidden="true"
				/>
			)}
			<div className="right" key={`${location.pathname}:${user?._id || 'nouser'}:${isActuallyImpersonating ? 'impersonating' : 'normal'}`}>
				<Header toggleMobileMenu={toggleMobileMenu} />
				<SwipeRefreshWrapper key={location.pathname}>
					<AppRoutes />
				</SwipeRefreshWrapper>
				{isActuallyImpersonating && (
					<div className="mobile-stop-button">
						<StopImpersonationFab />
					</div>
				)}
			</div>
			{/* Global Settlement Notifications */}
		</div>
	);
}

function App() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	return (
		<Router>
			<ImpersonationProvider>
				<SettlementWrapper>
					<Routes>
						{/* Login routes - standalone without layout, doesn't require auth */}
						<Route path="/" element={
							<RouteProtection requireAuth={false}>
								<Login />
							</RouteProtection>
						} />
						<Route path="/login" element={
							<RouteProtection requireAuth={false}>
								<Login />
							</RouteProtection>
						} />

						{/* All other routes with main app layout */}
						<Route
							path="/*"
							element={
								<AppLayout 
									isMobileMenuOpen={isMobileMenuOpen}
									setIsMobileMenuOpen={setIsMobileMenuOpen}
									toggleMobileMenu={toggleMobileMenu}
								/>
							}
						/>
					</Routes>
				</SettlementWrapper>
			</ImpersonationProvider>
		</Router>
	);
}

export default App;
