import React, { useEffect } from "react";
import classes from "./ProfileAvatarModal.module.css";
import ProfilePictureUpload from "../ProfilePictureUpload/ProfilePictureUpload";

const ProfileAvatarModal = ({ isOpen, onClose, user, onUpdateImage, onDeleteImage }) => {
	useEffect(() => {
		function onKey(e) {
			if (e.key === "Escape") onClose?.();
		}
		if (isOpen) window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const hasImage = !!user?.profilePictureUrl;

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
						/>
					</div>
					<div className={classes.actionsRow}>
						{hasImage ? (
							<>
								<label className={classes.actionBtn}>
									Edit
									<input type="file" accept="image/*" onChange={(e) => e.target.files[0] && onUpdateImage?.(URL.createObjectURL(e.target.files[0]))} style={{ display: "none" }} />
								</label>
								<button className={`${classes.actionBtn} ${classes.delete}`} onClick={onDeleteImage}>Delete</button>
							</>
						) : (
							<label className={classes.actionBtn}>
								Add image
								<input type="file" accept="image/*" onChange={(e) => e.target.files[0] && onUpdateImage?.(URL.createObjectURL(e.target.files[0]))} style={{ display: "none" }} />
							</label>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProfileAvatarModal;


