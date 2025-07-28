import React from "react";
import classes from "./ProfileAvatar.module.css";
import { getAvatarData, getAvatarColor } from "../../utils/avatarUtils";
import { getProfilePictureUrl } from "../../utils/imagekitUtils";

const ProfileAvatar = ({ imageUrl, name, size = "medium", showUsername = false, username = "", className = "" }) => {
	const user = { profilePictureUrl: imageUrl, name };
	const avatarData = getAvatarData(user);
	const avatarColor = getAvatarColor(name);

	return (
		<div className={`${classes.avatarContainer} ${classes[size]} ${className}`}>
			<div className={classes.imageWrapper}>
				{avatarData.type === "image" ? (
					<img
						src={getProfilePictureUrl(avatarData.source, size)}
						alt={`${name || "User"}'s profile`}
						className={classes.profileImage}
						onError={(e) => {
							// If image fails to load, show initials instead
							const initialsDiv = document.createElement("div");
							initialsDiv.className = classes.initialsAvatar;
							initialsDiv.textContent = avatarData.initials;
							initialsDiv.style.background = avatarColor;
							e.target.parentNode.replaceChild(initialsDiv, e.target);
						}}
					/>
				) : (
					<div className={classes.initialsAvatar} style={{ background: avatarColor }}>
						{avatarData.source}
					</div>
				)}
			</div>
			{showUsername && username && <span className={classes.username}>{username}</span>}
		</div>
	);
};

export default ProfileAvatar;
