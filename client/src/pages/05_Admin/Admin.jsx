import React, { useState, useEffect } from "react";
import { useUser } from "../../hooks/useUser";
import axios from "axios";
import classes from "./Admin.module.css";
import { RiUserLine, RiUserFollowLine, RiUserUnfollowLine, RiShieldUserLine } from "react-icons/ri";

const Admin = () => {
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
			<div className={classes.header}>
				<div className={classes.titleSection}>
					<h1>Admin Panel</h1>
					<p>Manage users and impersonation</p>
				</div>

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
			</div>

			<div className={classes.statsGrid}>
				<div className={classes.statCard}>
					<div className={classes.statNumber}>{stats.totalUsers}</div>
					<div className={classes.statLabel}>Total Users</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statNumber}>{stats.adminUsers}</div>
					<div className={classes.statLabel}>Admin Users</div>
				</div>
				<div className={classes.statCard}>
					<div className={classes.statNumber}>{stats.regularUsers}</div>
					<div className={classes.statLabel}>Regular Users</div>
				</div>
				<div className={classes.statCard}>
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
		</div>
	);
};

export default Admin;
