import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppRoutes from "./routes/AppRouts";
import Login from "./pages/00_Login/Login";
import "./index.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header/Header";
import AddItemButton from "./components/AddItemButton/AddItemButton";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";

function App() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	return (
		<Router>
			<ImpersonationProvider>
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
							</div>
						}
					/>
				</Routes>
			</ImpersonationProvider>
		</Router>
	);
}

export default App;
