import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppRoutes from "./routes/AppRouts";
import Login from "./pages/00_Login/Login";
import "./index.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header/Header";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { SettlementProvider } from "./contexts/SettlementContext";
import { PaymentApprovalProvider } from "./contexts/PaymentApprovalContext";
import { useUser } from "./hooks/useUser";
import RouteProtection from "./components/RouteProtection";

function SettlementWrapper({ children }) {
	const { user } = useUser();
	return (
		<SettlementProvider user={user}>
			<PaymentApprovalProvider user={user}>{children}</PaymentApprovalProvider>
		</SettlementProvider>
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
								<div className="app">
									<Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
									{isMobileMenuOpen && (
										<div
											className="mobile-backdrop"
											onClick={() => setIsMobileMenuOpen(false)}
											aria-hidden="true"
										/>
									)}
									<div className="right">
										<Header toggleMobileMenu={toggleMobileMenu} />
										<AppRoutes />
									</div>
									{/* Global Settlement Notifications */}
								</div>
							}
						/>
					</Routes>
				</SettlementWrapper>
			</ImpersonationProvider>
		</Router>
	);
}

export default App;
