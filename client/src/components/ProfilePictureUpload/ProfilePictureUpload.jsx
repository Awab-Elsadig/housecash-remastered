import React, { useEffect, useState } from "react";
import classes from "./ProfilePictureUpload.module.css";
const DEFAULT_IMAGE = "https://thumbs.dreamstime.com/b/web-269268516.jpg";

const ProfilePictureUpload = ({ currentImageUrl, size = "large" }) => {
	const [imageSrc, setImageSrc] = useState(currentImageUrl || DEFAULT_IMAGE);

	useEffect(() => {
		if (currentImageUrl && currentImageUrl.trim()) {
			setImageSrc(currentImageUrl);
		} else {
			setImageSrc(DEFAULT_IMAGE);
		}
	}, [currentImageUrl]);

	return (
		<div className={`${classes.profilePictureContainer} ${classes[size]}`}>
			<div className={classes.imageWrapper}>
				<img
					src={imageSrc}
					alt="Profile"
					className={classes.profileImage}
					onError={(e) => {
						if (e.target.src !== DEFAULT_IMAGE) {
							e.target.src = DEFAULT_IMAGE;
						}
					}}
				/>
			</div>
		</div>
	);
};

export default ProfilePictureUpload;
