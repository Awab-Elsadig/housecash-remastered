import React, { useState, useEffect } from "react";
import { useUser } from "../../hooks/useUser";
import { useInitialLoading } from "../../hooks/useLoading";
import { SettingsSkeleton } from "../../components/Skeleton";
import classes from "./Settings.module.css";
import {
	FaUser,
	FaHome,
	FaBell,
	FaPalette,
	FaShieldAlt,
	FaSignOutAlt,
	FaEdit,
	FaSave,
	FaTimes,
	FaUserPlus,
	FaTrash,
} from "react-icons/fa";
import axios from "axios";

const Settings = () => {
	const { user, houseMembers, fetchHouseMembers } = useUser();
	const isLoading = useInitialLoading(1000);
	const [activeTab, setActiveTab] = useState("profile");
	const [editingProfile, setEditingProfile] = useState(false);
	const [profileData, setProfileData] = useState({
		name: "",
		email: "",
		phone: "",
	});
	const [houseName, setHouseName] = useState("");
	const [editingHouse, setEditingHouse] = useState(false);
	const [notifications, setNotifications] = useState({
		expenseUpdates: true,
		paymentReminders: true,
		houseUpdates: true,
		emailNotifications: true,
	});
	const [theme, setTheme] = useState("light");
	const [newMemberEmail, setNewMemberEmail] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (user) {
			setProfileData({
				name: user.name || "",
				email: user.email || "",
				phone: user.phone || "",
			});
		}
	}, [user]);

	const handleProfileSave = async () => {
		try {
			setLoading(true);
			await axios.put(`/api/users/${user._id}`, profileData, {
				withCredentials: true,
			});
			setEditingProfile(false);
			// Refresh user data
		} catch (error) {
			console.error("Error updating profile:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleHouseSave = async () => {
		try {
			setLoading(true);
			await axios.put(
				`/api/houses/${user.house}`,
				{ name: houseName },
				{
					withCredentials: true,
				}
			);
			setEditingHouse(false);
		} catch (error) {
			console.error("Error updating house:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleInviteMember = async () => {
		try {
			setLoading(true);
			await axios.post(`/api/houses/${user.house}/invite`, { email: newMemberEmail }, { withCredentials: true });
			setNewMemberEmail("");
			fetchHouseMembers();
		} catch (error) {
			console.error("Error inviting member:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleRemoveMember = async (memberId) => {
		if (window.confirm("Are you sure you want to remove this member?")) {
			try {
				setLoading(true);
				await axios.delete(`/api/houses/${user.house}/members/${memberId}`, {
					withCredentials: true,
				});
				fetchHouseMembers();
			} catch (error) {
				console.error("Error removing member:", error);
			} finally {
				setLoading(false);
			}
		}
	};

	const handleNotificationChange = (key) => {
		setNotifications((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const handleLogout = async () => {
		try {
			await axios.post("/api/auth/logout", {}, { withCredentials: true });
			window.location.href = "/login";
		} catch (error) {
			console.error("Error logging out:", error);
		}
	};

	const tabs = [
		{ id: "profile", label: "Profile", icon: FaUser },
		{ id: "house", label: "House", icon: FaHome },
		{ id: "notifications", label: "Notifications", icon: FaBell },
		{ id: "appearance", label: "Appearance", icon: FaPalette },
		{ id: "security", label: "Security", icon: FaShieldAlt },
	];

	const renderProfileTab = () => (
		<div className={classes.tabContent}>
			<div className={classes.section}>
				<div className={classes.sectionHeader}>
					<h3>Personal Information</h3>
					{!editingProfile ? (
						<button className={classes.editButton} onClick={() => setEditingProfile(true)}>
							<FaEdit /> Edit
						</button>
					) : (
						<div className={classes.editActions}>
							<button className={classes.saveButton} onClick={handleProfileSave} disabled={loading}>
								<FaSave /> Save
							</button>
							<button className={classes.cancelButton} onClick={() => setEditingProfile(false)}>
								<FaTimes /> Cancel
							</button>
						</div>
					)}
				</div>

				<div className={classes.formGroup}>
					<label>Full Name</label>
					<input
						type="text"
						value={profileData.name}
						onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
						disabled={!editingProfile}
						className={classes.input}
					/>
				</div>

				<div className={classes.formGroup}>
					<label>Email</label>
					<input
						type="email"
						value={profileData.email}
						onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
						disabled={!editingProfile}
						className={classes.input}
					/>
				</div>

				<div className={classes.formGroup}>
					<label>Phone</label>
					<input
						type="tel"
						value={profileData.phone}
						onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
						disabled={!editingProfile}
						className={classes.input}
						placeholder="Optional"
					/>
				</div>
			</div>
		</div>
	);

	const renderHouseTab = () => (
		<div className={classes.tabContent}>
			<div className={classes.section}>
				<div className={classes.sectionHeader}>
					<h3>House Settings</h3>
					{!editingHouse ? (
						<button className={classes.editButton} onClick={() => setEditingHouse(true)}>
							<FaEdit /> Edit
						</button>
					) : (
						<div className={classes.editActions}>
							<button className={classes.saveButton} onClick={handleHouseSave} disabled={loading}>
								<FaSave /> Save
							</button>
							<button className={classes.cancelButton} onClick={() => setEditingHouse(false)}>
								<FaTimes /> Cancel
							</button>
						</div>
					)}
				</div>

				<div className={classes.formGroup}>
					<label>House Name</label>
					<input
						type="text"
						value={houseName}
						onChange={(e) => setHouseName(e.target.value)}
						disabled={!editingHouse}
						className={classes.input}
						placeholder="My House"
					/>
				</div>
			</div>

			<div className={classes.section}>
				<h3>House Members</h3>
				<div className={classes.membersList}>
					{houseMembers?.map((member) => (
						<div key={member._id} className={classes.memberItem}>
							<div className={classes.memberInfo}>
								<span className={classes.memberName}>{member.name}</span>
								<span className={classes.memberEmail}>{member.email}</span>
							</div>
							{member._id !== user._id && (
								<button className={classes.removeButton} onClick={() => handleRemoveMember(member._id)}>
									<FaTrash />
								</button>
							)}
						</div>
					))}
				</div>

				<div className={classes.inviteSection}>
					<h4>Invite New Member</h4>
					<div className={classes.inviteForm}>
						<input
							type="email"
							value={newMemberEmail}
							onChange={(e) => setNewMemberEmail(e.target.value)}
							placeholder="Enter email address"
							className={classes.input}
						/>
						<button className={classes.inviteButton} onClick={handleInviteMember} disabled={!newMemberEmail || loading}>
							<FaUserPlus /> Invite
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	const renderNotificationsTab = () => (
		<div className={classes.tabContent}>
			<div className={classes.section}>
				<h3>Notification Preferences</h3>

				<div className={classes.notificationItem}>
					<div>
						<h4>Expense Updates</h4>
						<p>Get notified when expenses are added or modified</p>
					</div>
					<label className={classes.switch}>
						<input
							type="checkbox"
							checked={notifications.expenseUpdates}
							onChange={() => handleNotificationChange("expenseUpdates")}
						/>
						<span className={classes.slider}></span>
					</label>
				</div>

				<div className={classes.notificationItem}>
					<div>
						<h4>Payment Reminders</h4>
						<p>Receive reminders for pending payments</p>
					</div>
					<label className={classes.switch}>
						<input
							type="checkbox"
							checked={notifications.paymentReminders}
							onChange={() => handleNotificationChange("paymentReminders")}
						/>
						<span className={classes.slider}></span>
					</label>
				</div>

				<div className={classes.notificationItem}>
					<div>
						<h4>House Updates</h4>
						<p>Stay informed about house member changes</p>
					</div>
					<label className={classes.switch}>
						<input
							type="checkbox"
							checked={notifications.houseUpdates}
							onChange={() => handleNotificationChange("houseUpdates")}
						/>
						<span className={classes.slider}></span>
					</label>
				</div>

				<div className={classes.notificationItem}>
					<div>
						<h4>Email Notifications</h4>
						<p>Receive notifications via email</p>
					</div>
					<label className={classes.switch}>
						<input
							type="checkbox"
							checked={notifications.emailNotifications}
							onChange={() => handleNotificationChange("emailNotifications")}
						/>
						<span className={classes.slider}></span>
					</label>
				</div>
			</div>
		</div>
	);

	const renderAppearanceTab = () => (
		<div className={classes.tabContent}>
			<div className={classes.section}>
				<h3>Theme Settings</h3>

				<div className={classes.themeOptions}>
					<div
						className={`${classes.themeOption} ${theme === "light" ? classes.active : ""}`}
						onClick={() => setTheme("light")}
					>
						<div className={classes.themePreview}>
							<div className={`${classes.themeColor} ${classes.light}`}></div>
						</div>
						<span>Light</span>
					</div>

					<div
						className={`${classes.themeOption} ${theme === "dark" ? classes.active : ""}`}
						onClick={() => setTheme("dark")}
					>
						<div className={classes.themePreview}>
							<div className={`${classes.themeColor} ${classes.dark}`}></div>
						</div>
						<span>Dark</span>
					</div>

					<div
						className={`${classes.themeOption} ${theme === "auto" ? classes.active : ""}`}
						onClick={() => setTheme("auto")}
					>
						<div className={classes.themePreview}>
							<div className={`${classes.themeColor} ${classes.auto}`}></div>
						</div>
						<span>Auto</span>
					</div>
				</div>
			</div>
		</div>
	);

	const renderSecurityTab = () => (
		<div className={classes.tabContent}>
			<div className={classes.section}>
				<h3>Account Security</h3>

				<div className={classes.securityItem}>
					<h4>Change Password</h4>
					<p>Update your account password</p>
					<button className={classes.actionButton}>Change Password</button>
				</div>

				<div className={classes.securityItem}>
					<h4>Two-Factor Authentication</h4>
					<p>Add an extra layer of security to your account</p>
					<button className={classes.actionButton}>Enable 2FA</button>
				</div>

				<div className={classes.securityItem}>
					<h4>Active Sessions</h4>
					<p>Manage devices that have access to your account</p>
					<button className={classes.actionButton}>View Sessions</button>
				</div>
			</div>

			<div className={classes.dangerZone}>
				<h3>Danger Zone</h3>
				<div className={classes.securityItem}>
					<h4>Sign Out</h4>
					<p>Sign out from your account</p>
					<button className={classes.logoutButton} onClick={handleLogout}>
						<FaSignOutAlt /> Sign Out
					</button>
				</div>
			</div>
		</div>
	);

	const renderTabContent = () => {
		switch (activeTab) {
			case "profile":
				return renderProfileTab();
			case "house":
				return renderHouseTab();
			case "notifications":
				return renderNotificationsTab();
			case "appearance":
				return renderAppearanceTab();
			case "security":
				return renderSecurityTab();
			default:
				return renderProfileTab();
		}
	};

	return (
		<div className={classes.settings}>
			{isLoading ? (
				<SettingsSkeleton />
			) : (
				<div className={classes.settingsContainer}>
					<div className={classes.settingsSidebar}>
						{tabs.map((tab) => {
							const IconComponent = tab.icon;
							return (
								<button
									key={tab.id}
									className={`${classes.tabButton} ${activeTab === tab.id ? classes.active : ""}`}
									onClick={() => setActiveTab(tab.id)}
								>
									<IconComponent className={classes.tabIcon} />
									{tab.label}
								</button>
							);
						})}
					</div>

					<div className={classes.settingsContent}>{renderTabContent()}</div>
				</div>
			)}
		</div>
	);
};

export default Settings;
