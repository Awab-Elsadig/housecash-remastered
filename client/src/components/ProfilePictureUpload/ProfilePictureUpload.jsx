import React, { useState, useRef, useEffect } from "react";
import { MdEdit, MdDelete, MdCloudUpload } from "react-icons/md";
import { FaSpinner } from "react-icons/fa";
import { useImageUpload } from "../../hooks/useImageUpload";
import { getProfilePictureUrl, preloadImage } from "../../utils/imagekitUtils";
import classes from "./ProfilePictureUpload.module.css";

const ProfilePictureUpload = ({ currentImageUrl, onImageUpdate, onImageDelete, size = "large" }) => {
	const { uploadImage, updateProfilePicture, isUploading, uploadError } = useImageUpload();
	const [showActions, setShowActions] = useState(false);
	const [localImageUrl, setLocalImageUrl] = useState(currentImageUrl);
	const fileInputRef = useRef(null);

	const defaultImage = "https://thumbs.dreamstime.com/b/web-269268516.jpg";

	// Sync local state with prop changes (handles refresh scenarios)
	useEffect(() => {
		setLocalImageUrl(currentImageUrl);

		// Preload the image for better user experience
		if (currentImageUrl) {
			preloadImage(currentImageUrl).catch((error) => {
				console.warn("Failed to preload profile image:", error);
			});
		}
	}, [currentImageUrl]);

	const handleFileSelect = (event) => {
		const file = event.target.files[0];
		if (file) {
			handleImageUpload(file);
		}
	};

	const handleImageUpload = async (file) => {
		// Validate file type
		if (!file.type.startsWith("image/")) {
			alert("Please select an image file");
			return;
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			alert("Image size should be less than 5MB");
			return;
		}

		try {
			// Upload to ImageKit
			const uploadResult = await uploadImage(file, "profile-pictures");

			if (uploadResult.success) {
				// Update user profile in database with both URL and fileId
				const updateResult = await updateProfilePicture(uploadResult.data.url, uploadResult.data.fileId);

				if (updateResult.success) {
					setLocalImageUrl(uploadResult.data.url);
					if (onImageUpdate) {
						onImageUpdate(uploadResult.data.url, updateResult.data.user);
					}
				}
			}
		} catch (error) {
			console.error("Error uploading image:", error);
			alert("Failed to upload image. Please try again.");
		}
	};

	const handleImageDelete = async () => {
		if (!localImageUrl || localImageUrl === defaultImage) return;

		try {
			const confirmed = window.confirm("Are you sure you want to remove your profile picture?");
			if (!confirmed) return;

			// Call the parent component's delete handler
			// The parent (Settings.jsx) will handle the actual API call
			if (onImageDelete) {
				onImageDelete();
				// Update local state immediately for better UX
				setLocalImageUrl("");
			}
		} catch (error) {
			console.error("Error removing profile picture:", error);
			alert("Failed to remove profile picture. Please try again.");
		}
	};

	const triggerFileSelect = () => {
		fileInputRef.current?.click();
	};

	return (
		<div
			className={`${classes.profilePictureContainer} ${classes[size]}`}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
		>
			<div className={classes.imageWrapper}>
				<img
					src={getProfilePictureUrl(localImageUrl, size) || defaultImage}
					alt="Profile"
					className={classes.profileImage}
					onError={(e) => {
						// Only fallback to default if it's not already the default image
						if (e.target.src !== defaultImage) {
							console.warn("Failed to load profile image:", localImageUrl);
							e.target.src = defaultImage;
						}
					}}
					onLoad={() => {
						// Image loaded successfully - you can add any success handling here if needed
					}}
				/>{" "}
				{isUploading && (
					<div className={classes.uploadingOverlay}>
						<FaSpinner className={classes.spinner} />
						<span>Uploading...</span>
					</div>
				)}
				{showActions && !isUploading && (
					<div className={classes.actionOverlay}>
						<button onClick={triggerFileSelect} className={classes.actionButton} title="Change picture" type="button">
							{localImageUrl && localImageUrl !== defaultImage ? <MdEdit /> : <MdCloudUpload />}
						</button>

						{localImageUrl && localImageUrl !== defaultImage && (
							<button
								onClick={handleImageDelete}
								className={`${classes.actionButton} ${classes.deleteButton}`}
								title="Remove picture"
								type="button"
							>
								<MdDelete />
							</button>
						)}
					</div>
				)}
			</div>

			<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />

			{uploadError && <div className={classes.errorMessage}>{uploadError}</div>}
		</div>
	);
};

export default ProfilePictureUpload;
