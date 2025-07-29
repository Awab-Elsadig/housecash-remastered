import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppRoutes from "./routes/AppRouts";
import Login from "./pages/00_Login/Login";
import "./index.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header/Header";
import AddItemButton from "./components/AddItemButton/AddItemButton";
import SettlementNotifications from "./components/SettlementNotifications/SettlementNotifications";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import { SettlementProvider } from "./contexts/SettlementContext";

function App() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	// Handle settlement acceptance - this will trigger settlement processing
	const handleSettlementAccepted = (senderId) => {
		console.log("Settlement accepted for sender:", senderId);
		// The actual settlement processing will be handled by the NetBalance component
		// when the user navigates to the dashboard, or we can dispatch a custom event
		window.dispatchEvent(
			new CustomEvent("settlementAccepted", {
				detail: { senderId },
			})
		);
	};

	return (
		<Router>
			<ImpersonationProvider>
				<SettlementProvider>
					<Routes>
						{/* Login route - standalone without layout */}
						<Route path="/" element={<Login />} />

						{/* All other routes with main app layout */}
						<Route
							path="/*"
							element={
								<div className="app">
									<Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
									<div className="right">
										<Header toggleMobileMenu={toggleMobileMenu} />
										<AppRoutes />
									</div>
									{/* Global AddItem Button for Mobile */}
									<div className="mobile-add-button">
										<AddItemButton />
									</div>
									{/* Global Settlement Notifications */}
									<SettlementNotifications onSettlementAccepted={handleSettlementAccepted} />
								</div>
							}
						/>
					</Routes>
				</SettlementProvider>
			</ImpersonationProvider>
		</Router>
	);
}

export default App;
