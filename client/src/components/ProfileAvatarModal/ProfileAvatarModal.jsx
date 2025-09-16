import React, { useEffect, useState } from "react";
import classes from "./ProfileAvatarModal.module.css";
import ProfilePictureUpload from "../ProfilePictureUpload/ProfilePictureUpload";
import { useImageUpload } from "../../hooks/useImageUpload";

const ProfileAvatarModal = ({ isOpen, onClose, user, onUpdateImage, onDeleteImage }) => {
	const { uploadImage, updateProfilePicture, isUploading } = useImageUpload();
	const [uploadingFile, setUploadingFile] = useState(null);

	useEffect(() => {
		function onKey(e) {
			if (e.key === "Escape") onClose?.();
		}
		if (isOpen) window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const hasImage = !!user?.profilePictureUrl;

	const handleFileUpload = async (file) => {
		if (!file) return;
		
		if (!file.type.startsWith("image/")) {
			alert("Please select an image file");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			alert("Image size should be less than 5MB");
			return;
		}

		setUploadingFile(file);
		try {
			console.log("Modal: Starting image upload for file:", file.name);
			const uploadResult = await uploadImage(file, "profile-pictures");
			console.log("Modal: Upload result:", uploadResult);
			
			if (uploadResult.success) {
				console.log("Modal: Upload successful, updating profile picture");
				const updateResult = await updateProfilePicture(uploadResult.data.url, uploadResult.data.fileId);
				console.log("Modal: Profile update result:", updateResult);
				
				if (updateResult.success) {
					onUpdateImage?.(uploadResult.data.url, updateResult.user);
					console.log("Modal: Profile picture updated successfully");
				} else {
					alert("Failed to update profile picture. Please try again.");
				}
			} else {
				alert(`Upload failed: ${uploadResult.error || "Unknown error"}`);
			}
		} catch (error) {
			console.error("Modal: Error handling image upload:", error);
			alert(`Upload failed: ${error.message || "Unknown error"}`);
		} finally {
			setUploadingFile(null);
		}
	};

	return (
		<div className={classes.overlay} onClick={onClose}>
			<div className={classes.modal} onClick={(e) => e.stopPropagation()}>
				<div className={classes.header}>
					<h3>Profile picture</h3>
					<button className={classes.close} onClick={onClose}>&times;</button>
				</div>
				<div className={classes.content}>
					<div className={classes.previewRow}>
						<ProfilePictureUpload
							currentImageUrl={user?.profilePictureUrl}
							onImageUpdate={onUpdateImage}
							onImageDelete={onDeleteImage}
							size="large"
							onEditClick={null}
						/>
					</div>
					<div className={classes.actionsRow}>
						{hasImage ? (
							<>
								<label className={classes.actionBtn} disabled={isUploading || uploadingFile}>
									{isUploading || uploadingFile ? "Uploading..." : "Edit"}
									<input 
										type="file" 
										accept="image/*" 
										onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} 
										style={{ display: "none" }}
										disabled={isUploading || uploadingFile}
									/>
								</label>
								<button className={`${classes.actionBtn} ${classes.delete}`} onClick={onDeleteImage} disabled={isUploading || uploadingFile}>
									Delete
								</button>
							</>
						) : (
							<label className={classes.actionBtn} disabled={isUploading || uploadingFile}>
								{isUploading || uploadingFile ? "Uploading..." : "Add image"}
								<input 
									type="file" 
									accept="image/*" 
									onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} 
									style={{ display: "none" }}
									disabled={isUploading || uploadingFile}
								/>
							</label>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProfileAvatarModal;


