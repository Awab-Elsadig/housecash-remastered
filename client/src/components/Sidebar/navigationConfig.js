import { RiDashboardFill } from "react-icons/ri";
import { FaMoneyBill1Wave } from "react-icons/fa6";
import { FaHistory } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";

// Navigation items configuration
export const navItems = [
	{
		id: "dashboard",
		label: "Dashboard",
		path: "/dashboard",
		icon: RiDashboardFill,
	},
	{
		id: "expenses",
		label: "Expenses",
		path: "/expenses",
		icon: FaMoneyBill1Wave,
	},
	{
		id: "history",
		label: "Payment History",
		path: "/payment-history",
		icon: FaHistory,
	},
	{
		id: "settings",
		label: "Settings",
		path: "/settings",
		icon: IoSettingsOutline,
	},
];

export default navItems;
