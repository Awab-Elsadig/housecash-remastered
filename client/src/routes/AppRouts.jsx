import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/01_Dashboard/Dashboard";
import Expenses from "../pages/02_Expenses/Expenses";
import PaymentHistory from "../pages/03_PaymentHistory/PaymentHistory";
import Settings from "../pages/04_Settings/Settings";
import Admin from "../pages/05_Admin/Admin";
import NotFound from "../pages/NotFound";

const AppRoutes = () => {
	// This is going to be the routes for the Housecash application
	// Using React Router v6+ syntax with Routes and Route components
	return (
		<Routes>
			{/* Main application routes */}
			<Route path="/dashboard" element={<Dashboard />} />
			<Route path="/expenses" element={<Expenses />} />
			<Route path="/payment-history" element={<PaymentHistory />} />
			<Route path="/settings" element={<Settings />} />
			<Route path="/admin" element={<Admin />} />

			{/* Catch-all route for 404 pages */}
			<Route path="*" element={<NotFound />} />
		</Routes>
	);
};

export default AppRoutes;
