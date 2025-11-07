import React, { useEffect, useRef, useState, useCallback } from "react";
import classes from "./Settings.module.css";
import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import { MdEdit } from "react-icons/md";
import { TbLogout } from "react-icons/tb";
import { FaCopy } from "react-icons/fa6";
import axios from "axios";
import { useUser } from "../../hooks/useUser";
import { useDataLoading } from "../../hooks/useLoading";
import { SettingsSkeleton } from "../../components/Skeleton";
import usePageRefresh from "../../hooks/usePageRefresh";
import ably from "../../ablyConfig";
import ProfilePictureUpload from "../../components/ProfilePictureUpload/ProfilePictureUpload";
import Tooltip from "../../components/Tooltip";

const Settings = () => {
	useEffect(() => {
		document.title = "Settings - HouseCash";
	}, []);

	const navigate = useNavigate();
	const { user, updateUser, houseMembers, updateHouseMembers, logout } = useUser();
	const editingInput = useRef();

	// Comprehensive loading check - wait for all data to be processed
	const dataReady =
		user && houseMembers && user.name !== undefined && user.username !== undefined && user.houseCode !== undefined;

	const isLoading = useDataLoading(dataReady); // For the modal popup editing functionality
	const [editingField, setEditingField] = useState(null); // 'name' or 'username'
	const [editingValue, setEditingValue] = useState("");
	const [copySuccess, setCopySuccess] = useState(false);

	const handleLogout = async () => {
		await logout();
		navigate("/");
	};

	// Opens the modal popup for editing the selected field
	const openEditPopup = (field) => {
		if (!user) return;

		setEditingField(field);
		if (field === "name") {
			setEditingValue(user.name || "");
		} else if (field === "username") {
			setEditingValue(user.username || "");
		}
	};

	const handleInputChange = (e) => {
		let value = e.target.value;
		if (editingField === "username") {
			value = value.toUpperCase().slice(0, 3);
		}
		setEditingValue(value);
	};

	useEffect(() => {
		if (editingField) editingInput.current.focus();
	}, [editingField]);

	const handleSave = (e) => {
		e.preventDefault();
		if (!user) return;

		axios
			.put(`/api/users/update-user/${user._id}`, { [editingField]: editingValue }, { withCredentials: true })
			.then(async () => {
				updateUser({
					...user,
					[editingField]: editingValue,
				});

				// Update house members correctly
				const newMembers = [...houseMembers];
				const index = newMembers.findIndex((m) => m._id === user._id);
				if (index !== -1) {
					newMembers[index] = {
						...newMembers[index],
						[editingField]: editingValue,
					};
					updateHouseMembers(newMembers);
				}

				// Notify other house members about the update via Ably
				if (user?.houseCode) {
					try {
						const channel = ably.channels.get(`house:${user.houseCode}`);
						await channel.publish("fetchUpdate", {
							timestamp: Date.now(),
							type: "user_update",
							userId: user._id,
						});
					} catch (error) {
						console.error("Error sending Ably update:", error);
					}
				}
			})
			.catch((err) => console.error("Error updating user", err));
		setEditingField(null);
	};

	const handleCopy = () => {
		if (!user?.houseCode) return;
		navigator.clipboard
			.writeText(user.houseCode)
			.then(() => {
				setCopySuccess(true);
				setTimeout(() => setCopySuccess(false), 2000);
			})
			.catch((err) => console.error("Failed to copy", err));
	};

	// Refresh function for settings page
	const handleRefresh = useCallback(async () => {
		try {
			// Refresh user data
			await updateUser();
		} catch (error) {
			console.error("Error refreshing settings data:", error);
		}
	}, [updateUser]);

	// Register refresh function with the global refresh system
	usePageRefresh(handleRefresh, 'settings');

	if (isLoading) {
		return <SettingsSkeleton />;
	}

	return (
		<div className={classes.settingsPage}>
			{/* Header Section */}
			<header className={classes.header}>
				<button className={classes.backBtn} onClick={() => navigate(-1)}>
					<IoMdArrowRoundBack />
				</button>

				<div className={classes.profileSection}>
				<ProfilePictureUpload currentImageUrl={user?.profilePictureUrl} size="large" />
					<h1 className={classes.userName}>{user?.name || "User"}</h1>
				</div>

				<Tooltip content="Log out of your account" position="left">
					<button className={classes.logout} onClick={handleLogout}>
						<TbLogout />
					</button>
				</Tooltip>
			</header>

			{/* Settings Content */}
			<main className={classes.content}>
				<div className={classes.settingsCard}>
					<div className={classes.settingItem}>
						<label>Name</label>
						<div className={classes.valueContainer}>
							<span>{user?.name || "Not set"}</span>
							<Tooltip content="Edit your name" position="top">
								<button className={classes.editBtn} onClick={() => openEditPopup("name")}>
									<MdEdit />
								</button>
							</Tooltip>
						</div>
					</div>

					<div className={classes.settingItem}>
						<label>Username</label>
						<div className={classes.valueContainer}>
							<span>{user?.username || "Not set"}</span>
							<Tooltip content="Edit your username (3 letters)" position="top">
								<button className={classes.editBtn} onClick={() => openEditPopup("username")}>
									<MdEdit />
								</button>
							</Tooltip>
						</div>
					</div>

					<div className={classes.settingItem}>
						<label>House Code</label>
						<div className={classes.valueContainer}>
							<span>{user?.houseCode || "Not set"}</span>
							<div className={classes.copyContainer}>
								{copySuccess && <div className={classes.copySuccess}>Copied!</div>}
								<Tooltip content="Copy house code to clipboard" position="top">
									<button className={classes.copyBtn} onClick={handleCopy}>
										<FaCopy />
									</button>
								</Tooltip>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Modal Popup for Editing Name/Username */}
			{editingField && (
				<div className={classes.modalOverlay} onClick={() => setEditingField(null)}>
					<form onSubmit={handleSave} className={classes.modal} onClick={(e) => e.stopPropagation()}>
						<h2>Edit {editingField.charAt(0).toUpperCase() + editingField.slice(1)}</h2>
						<input
							ref={editingInput}
							type="text"
							value={editingValue}
							onChange={handleInputChange}
							placeholder={editingField === "username" ? "Enter 3 letters" : `Enter ${editingField}`}
							maxLength={editingField === "username" ? 3 : undefined}
						/>
						<div className={classes.modalButtons}>
							<button type="submit" className={classes.saveBtn}>
								Save
							</button>
							<button type="button" className={classes.cancelBtn} onClick={() => setEditingField(null)}>
								Cancel
							</button>
						</div>
					</form>
				</div>
			)}

		</div>
	);
};

export default Settings;
