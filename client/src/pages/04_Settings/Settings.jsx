import React, { useEffect, useRef, useState } from "react";
import classes from "./Settings.module.css";
import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import { MdEdit } from "react-icons/md";
import { TbLogout } from "react-icons/tb";
import { FaCopy } from "react-icons/fa6";
import axios from "axios";
import { useUser } from "../../hooks/useUser";
import ably from "../../ablyConfig";
import ProfilePictureUpload from "../../components/ProfilePictureUpload/ProfilePictureUpload";

const Settings = () => {
	useEffect(() => {
		document.title = "Settings - HouseCash";
	}, []);

	const navigate = useNavigate();
	const { user, updateUser, houseMembers, updateHouseMembers } = useUser();
	const editingInput = useRef();

	// For the modal popup editing functionality
	const [editingField, setEditingField] = useState(null); // 'name' or 'username'
	const [editingValue, setEditingValue] = useState("");
	// For copy feedback
	const [copySuccess, setCopySuccess] = useState(false);
	// For the change password modal
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");

	const logout = async () => {
		axios.post("/api/auth/logout", {}, { withCredentials: true }).then((res) => {
			console.log(res.data);
		});
		sessionStorage.removeItem("user");
		sessionStorage.removeItem("houseMembers");
		sessionStorage.removeItem("items");
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

	// Handle input change with username-specific formatting
	const handleInputChange = (e) => {
		let value = e.target.value;

		if (editingField === "username") {
			// Convert to uppercase and limit to 3 characters
			value = value.toUpperCase().slice(0, 3);
		}

		setEditingValue(value);
	};

	useEffect(() => {
		if (editingField) editingInput.current.focus();
	}, [editingField]);

	// Save the new value (calls an API and closes the popup)
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

	// Copy house code to clipboard and show feedback
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

	// Handle Change Password: show modal
	const handleChangePasswordClick = () => {
		setShowPasswordModal(true);
		setCurrentPassword("");
		setPasswordError("");
	};

	// Verify the current password; if valid, navigate to the change password route
	const handlePasswordSubmit = async (e) => {
		e.preventDefault();
		if (!user) return;

		try {
			const res = await axios.post(
				`/api/auth/verify-password/${user._id}`,
				{ currentPassword },
				{ withCredentials: true }
			);
			if (res.data.valid) {
				// Optionally, set a re-authentication flag in context/sessionStorage
				navigate("/change-password");
			} else {
				setPasswordError("Incorrect password. Please try again.");
			}
		} catch (error) {
			setPasswordError(error.response?.data?.error || "An error occurred");
			console.error("Password verification error", error);
		}
	};

	// Handle profile picture update
	const handleImageUpdate = (newImageUrl, updatedUser) => {
		if (!user) return;

		// The ProfilePictureUpload component now handles the API call
		// and passes the updated user data, so we just need to update our state
		if (updatedUser) {
			updateUser({
				...user,
				profilePictureUrl: newImageUrl,
				profilePictureFileId: updatedUser.profilePictureFileId,
			});
		}
	};

	const handleImageDelete = () => {
		if (!user) return;

		axios
			.put(`/api/users/update-user/${user._id}`, { profilePictureUrl: null }, { withCredentials: true })
			.then(() => {
				updateUser({
					...user,
					profilePictureUrl: null,
				});
			})
			.catch((err) => console.error("Error deleting profile picture", err));
	};

	// Don't render if user data isn't loaded yet
	if (!user) {
		return (
			<div className={classes.settingsPage}>
				<header className={classes.header}>
					<button className={classes.backBtn} onClick={() => navigate(-1)}>
						<IoMdArrowRoundBack />
					</button>
					<div className={classes.profileSection}>
						<div className={classes.loadingProfile}>
							<img src={"https://thumbs.dreamstime.com/b/web-269268516.jpg"} alt="Profile" />
						</div>
						<h1 className={classes.userName}>Loading...</h1>
					</div>
					<button className={classes.logout}>
						<TbLogout />
					</button>
				</header>
				<main className={classes.content}>
					<div className={classes.settingsCard}>
						<div className={classes.loadingText}>Loading user information...</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className={classes.settingsPage}>
			{/* Header Section */}
			<header className={classes.header}>
				<button className={classes.backBtn} onClick={() => navigate(-1)}>
					<IoMdArrowRoundBack />
				</button>

				<div className={classes.profileSection}>
					<ProfilePictureUpload
						currentImageUrl={user?.profilePictureUrl}
						onImageUpdate={handleImageUpdate}
						onImageDelete={handleImageDelete}
						size="large"
					/>
					<h1 className={classes.userName}>{user?.name || "User"}</h1>
				</div>

				<button className={classes.logout} onClick={logout}>
					<TbLogout />
				</button>
			</header>

			{/* Settings Content */}
			<main className={classes.content}>
				<div className={classes.settingsCard}>
					<div className={classes.settingItem}>
						<label>Name</label>
						<div className={classes.valueContainer}>
							<span>{user?.name || "Not set"}</span>
							<button className={classes.editBtn} onClick={() => openEditPopup("name")}>
								<MdEdit />
							</button>
						</div>
					</div>

					<div className={classes.settingItem}>
						<label>Username</label>
						<div className={classes.valueContainer}>
							<span>{user?.username || "Not set"}</span>
							<button className={classes.editBtn} onClick={() => openEditPopup("username")}>
								<MdEdit />
							</button>
						</div>
					</div>

					<div className={classes.settingItem}>
						<label>House Code</label>
						<div className={classes.valueContainer}>
							<span>{user?.houseCode || "Not set"}</span>
							<div className={classes.copyContainer}>
								{copySuccess && <div className={classes.copySuccess}>Copied!</div>}
								<button className={classes.copyBtn} onClick={handleCopy}>
									<FaCopy />
								</button>
							</div>
						</div>
					</div>
				</div>

				<button onClick={handleChangePasswordClick} className={classes.changePasswordBtn}>
					Change Password
				</button>
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

			{/* Modal Popup for Verifying Current Password */}
			{showPasswordModal && (
				<div className={classes.modalOverlay} onClick={() => setShowPasswordModal(false)}>
					<form onSubmit={handlePasswordSubmit} className={classes.modal} onClick={(e) => e.stopPropagation()}>
						<h2>Verify Current Password</h2>
						<input
							type="password"
							placeholder="Enter current password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
						/>
						{passwordError && <div className={classes.error}>{passwordError}</div>}
						<div className={classes.modalButtons}>
							<button type="submit" className={classes.saveBtn}>
								Submit
							</button>
							<button type="button" className={classes.cancelBtn} onClick={() => setShowPasswordModal(false)}>
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
