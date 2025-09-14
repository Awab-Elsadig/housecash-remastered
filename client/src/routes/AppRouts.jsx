import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/01_Dashboard/Dashboard";
import Expenses from "../pages/02_Expenses/Expenses";
import PaymentHistory from "../pages/03_PaymentHistory/PaymentHistory";
import Settings from "../pages/04_Settings/Settings";
import Admin from "../pages/05_Admin/Admin";
import NotFound from "../pages/NotFound";
import RouteProtection from "../components/RouteProtection";

const AppRoutes = () => {
	// This is going to be the routes for the Housecash application
	// Using React Router v6+ syntax with Routes and Route components
	return (
		<Routes>
			{/* Main application routes - all require authentication */}
			<Route path="/dashboard" element={
				<RouteProtection requireAuth={true}>
					<Dashboard />
				</RouteProtection>
			} />
			<Route path="/expenses" element={
				<RouteProtection requireAuth={true}>
					<Expenses />
				</RouteProtection>
			} />
			<Route path="/payment-history" element={
				<RouteProtection requireAuth={true}>
					<PaymentHistory />
				</RouteProtection>
			} />
			<Route path="/settings" element={
				<RouteProtection requireAuth={true}>
					<Settings />
				</RouteProtection>
			} />
			<Route path="/admin" element={
				<RouteProtection requireAuth={true}>
					<Admin />
				</RouteProtection>
			} />

			{/* Catch-all route for 404 pages */}
			<Route path="*" element={<NotFound />} />
		</Routes>
	);
};

export default AppRoutes;
