import React, { useEffect, useRef, useState } from "react";
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
import ably from "../../ablyConfig";
import ProfilePictureUpload from "../../components/ProfilePictureUpload/ProfilePictureUpload";
import ProfileAvatarModal from "../../components/ProfileAvatarModal/ProfileAvatarModal";

const Settings = () => {
	useEffect(() => {
		document.title = "Settings - HouseCash";
	}, []);

	const navigate = useNavigate();
	const { user, updateUser, houseMembers, updateHouseMembers } = useUser();
	const editingInput = useRef();

	// Comprehensive loading check - wait for all data to be processed
	const dataReady =
		user && houseMembers && user.name !== undefined && user.username !== undefined && user.houseCode !== undefined;

	const isLoading = useDataLoading(dataReady); // For the modal popup editing functionality
	const [editingField, setEditingField] = useState(null); // 'name' or 'username'
	const [editingValue, setEditingValue] = useState("");
	const [copySuccess, setCopySuccess] = useState(false);
	const [avatarModalOpen, setAvatarModalOpen] = useState(false);

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

	// Handle profile picture update
	const handleImageUpdate = (newImageUrl, updatedUser) => {
		if (!user) return;
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

	const updateAvatarPrefs = async (prefs) => {
		if (!user) return;
		try {
			await axios.put(`/api/users/update-user/${user._id}`, prefs, { withCredentials: true });
			updateUser({ ...user, ...prefs });
		} catch (e) {
			console.error("Failed to update avatar preferences", e);
		}
	};

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
					<ProfilePictureUpload
						currentImageUrl={user?.profilePictureUrl}
						onImageUpdate={handleImageUpdate}
						onImageDelete={handleImageDelete}
						size="large"
						name={user?.name}
						avatarMode={user?.avatarMode || (user?.profilePictureUrl ? "image" : "initials")}
						initialsCount={user?.initialsCount || 2}
						onEditClick={() => setAvatarModalOpen(true)}
					/>
					<h1 className={classes.userName}>{user?.name || "User"}</h1>
				</div>

				<button className={classes.logout} onClick={logout} title="Log out of your account">
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
							<button className={classes.editBtn} onClick={() => openEditPopup("name")} title="Edit your name">
								<MdEdit />
							</button>
						</div>
					</div>

					<div className={classes.settingItem}>
						<label>Username</label>
						<div className={classes.valueContainer}>
							<span>{user?.username || "Not set"}</span>
							<button className={classes.editBtn} onClick={() => openEditPopup("username")} title="Edit your username (3 letters)">
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
								<button className={classes.copyBtn} onClick={handleCopy} title="Copy house code to clipboard">
									<FaCopy />
								</button>
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

			<ProfileAvatarModal
				isOpen={avatarModalOpen}
				onClose={() => setAvatarModalOpen(false)}
				user={user}
				onUpdateMode={(p) => updateAvatarPrefs(p)}
				onUpdateImage={handleImageUpdate}
				onDeleteImage={handleImageDelete}
			/>
		</div>
	);
};

export default Settings;
