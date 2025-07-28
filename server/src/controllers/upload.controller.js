import imagekit from "../config/imagekit.config.js";
import { User } from "../models/user.model.js";

// Get ImageKit authentication parameters for client-side upload
export const getImageKitAuth = async (req, res) => {
	try {
		const authenticationParameters = imagekit.getAuthenticationParameters();
		res.status(200).json({
			success: true,
			data: authenticationParameters,
		});
	} catch (error) {
		console.error("Error getting ImageKit auth:", error);
		res.status(500).json({
			success: false,
			message: "Failed to get authentication parameters",
			error: error.message,
		});
	}
};

// Update user profile picture URL after successful upload
export const updateProfilePicture = async (req, res) => {
	try {
		const { profilePictureUrl, profilePictureFileId } = req.body;
		const userId = req.user._id;

		if (!profilePictureUrl || !profilePictureFileId) {
			return res.status(400).json({
				success: false,
				message: "Profile picture URL and file ID are required",
			});
		}

		// Get current user to check for existing profile picture
		const currentUser = await User.findById(userId);
		if (!currentUser) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		// Delete old profile picture from ImageKit if it exists
		if (currentUser.profilePictureFileId) {
			try {
				await imagekit.deleteFile(currentUser.profilePictureFileId);
				console.log(`Deleted old profile picture: ${currentUser.profilePictureFileId}`);
			} catch (deleteError) {
				console.warn("Failed to delete old profile picture:", deleteError);
				// Continue with update even if deletion fails
			}
		}

		// Update user with new profile picture URL and fileId
		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{
				profilePictureUrl,
				profilePictureFileId,
			},
			{ new: true, select: "-password" }
		);

		res.status(200).json({
			success: true,
			message: "Profile picture updated successfully",
			data: {
				user: updatedUser,
			},
		});
	} catch (error) {
		console.error("Error updating profile picture:", error);
		res.status(500).json({
			success: false,
			message: "Failed to update profile picture",
			error: error.message,
		});
	}
};

// Delete image from ImageKit (optional cleanup)
export const deleteImage = async (req, res) => {
	try {
		const { fileId } = req.params;

		if (!fileId) {
			return res.status(400).json({
				success: false,
				message: "File ID is required",
			});
		}

		// Delete image from ImageKit
		await imagekit.deleteFile(fileId);

		res.status(200).json({
			success: true,
			message: "Image deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting image:", error);
		res.status(500).json({
			success: false,
			message: "Failed to delete image",
			error: error.message,
		});
	}
};
