import React, { useState, useEffect } from "react";
import { useUser } from "../../hooks/useUser";
import axios from "axios";
import classes from "./Admin.module.css";
import {
	RiUserLine,
	RiUserFollowLine,
	RiUserUnfollowLine,
	RiShieldUserLine,
	RiAdminLine,
	RiGroupLine,
	RiHome2Line,
} from "react-icons/ri";

const BackfillComponent = () => {
	const [missingCount, setMissingCount] = useState(0);
	const [isChecking, setIsChecking] = useState(true);
	const [isBackfilling, setIsBackfilling] = useState(false);
	const [backfillResult, setBackfillResult] = useState(null);
	const [error, setError] = useState(null);

	const checkMissing = async () => {
		setIsChecking(true);
		setError(null);
		try {
			const response = await axios.get("/api/items/maintenance/list-missing-housecode");
			setMissingCount(response.data.total);
		} catch (err) {
			setError(err.response?.data?.error || "Failed to check for missing house codes.");
		} finally {
			setIsChecking(false);
		}
	};

	const runBackfill = async () => {
		if (missingCount === 0) return;
		setIsBackfilling(true);
		setError(null);
		setBackfillResult(null);
		try {
			const response = await axios.post("/api/items/maintenance/backfill-housecode");
			setBackfillResult(response.data);
			// Re-check the count after backfill
			checkMissing();
		} catch (err) {
			setError(err.response?.data?.error || "Backfill operation failed.");
		} finally {
			setIsBackfilling(false);
		}
	};

	useEffect(() => {
		checkMissing();
	}, []);

	return (
		<div className={classes.maintenanceSection}>
			<h3>Data Maintenance</h3>
			<div className={classes.backfillControl}>
				<div className={classes.backfillInfo}>
					<p>
						Items with missing <code>houseCode</code>: <strong>{isChecking ? "Checking..." : missingCount}</strong>
					</p>
					{error && <p className={classes.errorText}>{error}</p>}
				</div>
				<button onClick={runBackfill} disabled={isChecking || isBackfilling || missingCount === 0}>
					{isBackfilling ? "Running..." : "Run HouseCode Backfill"}
				</button>
			</div>
			{backfillResult && (
				<div className={classes.backfillResult}>
					<h4>Backfill Complete</h4>
					<p>
						- Items Updated: <strong>{backfillResult.updated}</strong>
					</p>
					<p>
						- Items Failed: <strong>{backfillResult.failed}</strong>
					</p>
					{backfillResult.failed > 0 && (
						<p className={classes.failureInfo}>
							Failures occur when a <code>houseCode</code> cannot be derived from the item's author, creator, or
							members. Check server logs for details.
						</p>
					)}
				</div>
			)}
		</div>
	);
};

const Admin = () => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const downloadReport = async (path, filename) => {
        try {
            const urlPath = `${apiBase}${path}`;
            const res = await fetch(urlPath, { credentials: "include" });
            if (!res.ok) throw new Error(`Download failed (${res.status})`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Report download error:", e);
            alert("Failed to download report. Please try again.");
        }
    };
	useEffect(() => {
		document.title = "Admin Panel - HouseCash";
	}, []);

	const { user } = useUser();
	const [allUsers, setAllUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isImpersonating, setIsImpersonating] = useState(false);
	const [impersonatedUser, setImpersonatedUser] = useState(null);

	// Check if current user is admin
	const isAdmin = user?.role === "admin";

	useEffect(() => {
		if (isAdmin) {
			fetchAllUsers();
		}
	}, [isAdmin]);

	useEffect(() => {
		// Filter users based on search query
		if (!searchQuery) {
			setFilteredUsers(allUsers);
		} else {
			const filtered = allUsers.filter(
				(u) =>
					u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
					u.houseCode.toLowerCase().includes(searchQuery.toLowerCase())
			);
			setFilteredUsers(filtered);
		}
	}, [searchQuery, allUsers]);

	const fetchAllUsers = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await axios.get("/api/admin/users", {
				withCredentials: true,
			});
			if (response.data?.users) {
				setAllUsers(response.data.users);
			}
		} catch (error) {
			console.error("Error fetching users:", error);
			setError(error.response?.data?.error || "Failed to fetch users");
		} finally {
			setLoading(false);
		}
	};

	const handleImpersonate = async (targetUserId) => {
		setLoading(true);
		setError(null);
		try {
			// Start impersonation on the server
			const response = await axios.post("/api/admin/impersonate", { targetUserId }, { withCredentials: true });

			if (response.data?.user) {
				// Store impersonation data in sessionStorage for the context
				const impersonationData = {
					impersonatedUserId: response.data.user._id,
					originalAdminId: user._id,
					impersonatedUser: response.data.user,
					originalAdmin: user,
					timestamp: Date.now(),
				};

				sessionStorage.setItem("impersonationData", JSON.stringify(impersonationData));

				// Navigate to dashboard in the same window instead of opening new window
				window.location.href = "/dashboard";

				console.log("Impersonation started for:", response.data.user.name);
			}
		} catch (error) {
			console.error("Error impersonating user:", error);
			setError(error.response?.data?.error || "Failed to impersonate user");
		} finally {
			setLoading(false);
		}
	};

	const handleStopImpersonation = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await axios.post(
				"/api/admin/stop-impersonation",
				{},
				{
					withCredentials: true,
				}
			);

			if (response.status === 200) {
				setIsImpersonating(false);
				setImpersonatedUser(null);
				// Refresh the page to update the app context
				window.location.reload();
			}
		} catch (error) {
			console.error("Error stopping impersonation:", error);
			setError(error.response?.data?.error || "Failed to stop impersonation");
		} finally {
			setLoading(false);
		}
	};

	const getUserStats = () => {
		const totalUsers = allUsers.length;
		const adminUsers = allUsers.filter((u) => u.role === "admin").length;
		const regularUsers = totalUsers - adminUsers;
		const houseCodes = [...new Set(allUsers.map((u) => u.houseCode))].length;

		return { totalUsers, adminUsers, regularUsers, houseCodes };
	};

	const [migrateLoading, setMigrateLoading] = useState(false);
	const [migrateResult, setMigrateResult] = useState(null);
	const [migrateError, setMigrateError] = useState(null);

	const runItemsMigration = async () => {
		if (!window.confirm("This will remove 'got' from all items and normalize 'paid'. Proceed?")) return;
		setMigrateLoading(true);
		setMigrateResult(null);
		setMigrateError(null);
		try {
			const res = await axios.post("/api/admin/migrate/items/remove-got");
			setMigrateResult(res.data);
		} catch (e) {
			setMigrateError(e.response?.data?.error || "Migration failed");
		} finally {
			setMigrateLoading(false);
		}
	};

	if (!isAdmin) {
		return (
			<div className={classes.admin}>
				<div className={classes.accessDenied}>
					<RiShieldUserLine className={classes.accessIcon} />
					<h2>Access Denied</h2>
					<p>You need admin privileges to access this panel.</p>
				</div>
			</div>
		);
	}

	const stats = getUserStats();

	return (
		<div className={classes.admin}>
			{isImpersonating && impersonatedUser && (
				<div className={classes.impersonationBanner}>
					<div className={classes.impersonationInfo}>
						<RiUserFollowLine className={classes.impersonationIcon} />
						<span>
							Impersonating: <strong>{impersonatedUser.name}</strong>
						</span>
					</div>
					<button className={classes.stopImpersonationBtn} onClick={handleStopImpersonation} disabled={loading}>
						<RiUserUnfollowLine />
						Stop Impersonation
					</button>
				</div>
			)}

			<div className={classes.statsGrid}>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<RiUserLine />
					</div>
					<div className={classes.statNumber}>{stats.totalUsers}</div>
					<div className={classes.statLabel}>Total Users</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<RiAdminLine />
					</div>
					<div className={classes.statNumber}>{stats.adminUsers}</div>
					<div className={classes.statLabel}>Admin Users</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<RiGroupLine />
					</div>
					<div className={classes.statNumber}>{stats.regularUsers}</div>
					<div className={classes.statLabel}>Regular Users</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statIcon}>
						<RiHome2Line />
					</div>
					<div className={classes.statNumber}>{stats.houseCodes}</div>
					<div className={classes.statLabel}>House Codes</div>
				</div>
			</div>

			<div className={classes.userManagement}>
				<div className={classes.searchSection}>
					<input
						type="text"
						placeholder="Search users by name, username, email, or house code..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className={classes.searchInput}
					/>
				</div>

				{error && (
					<div className={classes.error}>
						<p>{error}</p>
					</div>
				)}

				{loading ? (
					<div className={classes.loading}>
						<p>Loading...</p>
					</div>
				) : (
					<div className={classes.usersList}>
						<div className={classes.usersHeader}>
							<span>User</span>
							<span>Email</span>
							<span>House Code</span>
							<span>Role</span>
							<span>Actions</span>
						</div>

						{filteredUsers.map((targetUser) => (
							<div key={targetUser._id} className={classes.userRow}>
								<div className={classes.userInfo}>
									<div className={classes.userAvatar}>
										{targetUser.username?.charAt(0)?.toUpperCase() || targetUser.name?.charAt(0)?.toUpperCase() || "?"}
									</div>
									<div className={classes.userDetails}>
										<div className={classes.userName}>{targetUser.name}</div>
										<div className={classes.userUsername}>@{targetUser.username}</div>
									</div>
								</div>

								<div className={classes.userEmail}>{targetUser.email}</div>
								<div className={classes.userHouseCode}>{targetUser.houseCode}</div>

								<div className={classes.userRole}>
									<span className={`${classes.roleBadge} ${classes[targetUser.role]}`}>{targetUser.role}</span>
								</div>

								<div className={classes.userActions}>
									{targetUser._id !== user._id ? (
										<button
											className={classes.impersonateBtn}
											onClick={() => handleImpersonate(targetUser._id)}
											disabled={loading || isImpersonating}
										>
											<RiUserFollowLine />
											Impersonate
										</button>
									) : (
										<span className={classes.currentUser}>Current User</span>
									)}
								</div>
							</div>
						))}

						{filteredUsers.length === 0 && !loading && (
							<div className={classes.noUsers}>
								<p>No users found matching your search.</p>
							</div>
						)}
					</div>
				)}
			</div>

			<BackfillComponent />
			<div className={classes.maintenanceSection}>
				<h3>Data Migration</h3>
				<p>Remove member 'got' and keep only 'paid' on all expenses.</p>
				<button onClick={runItemsMigration} disabled={migrateLoading}>
					{migrateLoading ? "Migrating..." : "Run Items Migration"}
				</button>
				{migrateError && <p className={classes.errorText}>{migrateError}</p>}
				{migrateResult && (
					<div className={classes.backfillResult}>
						<h4>Migration Complete</h4>
						<p>Unset modified: <strong>{migrateResult.unsetModified}</strong></p>
						<p>Normalized docs: <strong>{migrateResult.normalizedDocs}</strong></p>
					</div>
				)}
			</div>
			<div className={classes.reportsSection}>
				<h3>Reports</h3>
				<p>Export all past expenses as PDF or CSV.</p>
				<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
					<button type="button" className={classes.downloadBtn} onClick={() => downloadReport("/api/admin/reports/expenses.pdf", "expenses-report.pdf")}>Download PDF</button>
					<button type="button" className={classes.downloadBtn} onClick={() => downloadReport("/api/admin/reports/expenses.csv", "expenses-report.csv")}>Download CSV</button>
				</div>
			</div>
		</div>
	);
};

export default Admin;
