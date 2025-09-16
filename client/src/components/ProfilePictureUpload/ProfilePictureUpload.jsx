import React, { useState, useRef, useEffect } from "react";
import { MdEdit } from "react-icons/md";
import { FaSpinner } from "react-icons/fa";
import { useImageUpload } from "../../hooks/useImageUpload";
import { getProfilePictureUrl, preloadImage } from "../../utils/imagekitUtils";
import classes from "./ProfilePictureUpload.module.css";
import Tooltip from "../Tooltip";

const ProfilePictureUpload = ({ currentImageUrl, onImageUpdate, onImageDelete, size = "large", onEditClick }) => {
	const { uploadImage, updateProfilePicture, isUploading, uploadError } = useImageUpload();
	const [localImageUrl, setLocalImageUrl] = useState(currentImageUrl);
	const fileInputRef = useRef(null);

	const defaultImage = "https://thumbs.dreamstime.com/b/web-269268516.jpg";

	useEffect(() => {
		setLocalImageUrl(currentImageUrl);
		if (currentImageUrl) {
			preloadImage(currentImageUrl).catch(() => {});
		}
	}, [currentImageUrl]);

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		if (file) {
			handleImageUpload(file);
		}
	};

	const handleImageUpload = async (file) => {
		if (!file.type.startsWith("image/")) {
			alert("Please select an image file");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			alert("Image size should be less than 5MB");
			return;
		}
		try {
			console.log("Starting image upload for file:", file.name);
			const uploadResult = await uploadImage(file, "profile-pictures");
			console.log("Upload result:", uploadResult);
			
			if (uploadResult.success) {
				console.log("Upload successful, updating profile picture");
				const updateResult = await updateProfilePicture(uploadResult.data.url, uploadResult.data.fileId);
				console.log("Profile update result:", updateResult);
				
				if (updateResult.success) {
					// Update local state immediately for instant UI feedback
					setLocalImageUrl(uploadResult.data.url);
					// Update global user state
					onImageUpdate?.(uploadResult.data.url, updateResult.user);
					console.log("Profile picture updated successfully");
				} else {
					alert("Failed to update profile picture. Please try again.");
				}
			} else {
				alert(`Upload failed: ${uploadResult.error || "Unknown error"}`);
			}
		} catch (error) {
			console.error("Error handling image upload:", error);
			alert(`Upload failed: ${error.message || "Unknown error"}`);
		}
	};

	const triggerFileSelect = () => fileInputRef.current?.click();

	return (
		<div className={`${classes.profilePictureContainer} ${classes[size]} ${!onEditClick ? classes.nonClickable : ''}`}>
			<div className={classes.imageWrapper}>
				<img
					src={getProfilePictureUrl(localImageUrl, size) || defaultImage}
					alt="Profile"
					className={classes.profileImage}
					onError={(e) => {
						if (e.target.src !== defaultImage) e.target.src = defaultImage;
					}}
				/>
				{isUploading && (
					<div className={classes.uploadingOverlay}>
						<FaSpinner className={classes.spinner} />
						<span>Uploading...</span>
					</div>
				)}
				<div className={classes.actionOverlay}>
					<Tooltip content="Edit profile picture" position="top">
						<button
							type="button"
							className={classes.actionButton}
							onClick={() => (onEditClick ? onEditClick() : triggerFileSelect())}
						>
							<MdEdit />
						</button>
					</Tooltip>
				</div>
			</div>
			<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
			{uploadError && <div className={classes.errorMessage}>{uploadError}</div>}
		</div>
	);
};

export default ProfilePictureUpload;
