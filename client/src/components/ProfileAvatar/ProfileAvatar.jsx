import React from "react";
import classes from "./ProfileAvatar.module.css";
import { getAvatarData, getAvatarColor } from "../../utils/avatarUtils";

const ProfileAvatar = ({ imageUrl, name, size = "medium", showUsername = false, username = "", className = "", avatarMode, initialsCount }) => {
	const user = { profilePictureUrl: imageUrl, name, avatarMode, initialsCount };
	const avatarData = getAvatarData(user);
	const avatarColor = getAvatarColor(name);

	const defaultImage = "https://thumbs.dreamstime.com/b/web-269268516.jpg";

	return (
		<div className={`${classes.avatarContainer} ${classes[size]} ${className}`}>
			<div className={classes.imageWrapper}>
				{avatarData.type === "image" ? (
					<img
						src={avatarData.source || defaultImage}
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
				) : avatarData.type === "initials" ? (
					<div className={classes.initialsAvatar} style={{ background: avatarColor }}>
						{avatarData.source}
					</div>
				) : (
					<div className={classes.initialsAvatar} style={{ background: "#555" }} />
				)}
			</div>
			{showUsername && username && <span className={classes.username}>{username}</span>}
		</div>
	);
};

export default ProfileAvatar;
