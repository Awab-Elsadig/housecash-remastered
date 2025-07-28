import { useState } from "react";
import axios from "axios";
import imagekit from "../config/imagekit.config.js";

export const useImageUpload = () => {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState(null);

	const uploadImage = async (file, folder = "profile-pictures") => {
		setIsUploading(true);
		setUploadError(null);

		try {
			// Get authentication parameters from backend
			const authResponse = await axios.get("/api/upload/imagekit-auth", {
				withCredentials: true,
			});

			if (!authResponse.data.success) {
				throw new Error("Failed to get authentication parameters");
			}

			const authParams = authResponse.data.data;

			// Upload file to ImageKit
			const uploadResponse = await imagekit.upload({
				file: file,
				fileName: `${Date.now()}_${file.name}`,
				folder: folder,
				...authParams,
			});

			setIsUploading(false);
			return {
				success: true,
				data: {
					url: uploadResponse.url,
					fileId: uploadResponse.fileId,
					name: uploadResponse.name,
				},
			};
		} catch (error) {
			console.error("Upload error:", error);
			setIsUploading(false);
			setUploadError(error.message || "Upload failed");
			return {
				success: false,
				error: error.message || "Upload failed",
			};
		}
	};

	const updateProfilePicture = async (imageUrl, fileId) => {
		try {
			const response = await axios.post(
				"/api/upload/profile-picture",
				{
					profilePictureUrl: imageUrl,
					profilePictureFileId: fileId,
				},
				{ withCredentials: true }
			);

			return response.data;
		} catch (error) {
			console.error("Error updating profile picture:", error);
			throw error;
		}
	};

	const deleteImage = async (fileId) => {
		try {
			const response = await axios.delete(`/api/upload/image/${fileId}`, {
				withCredentials: true,
			});

			return response.data;
		} catch (error) {
			console.error("Error deleting image:", error);
			throw error;
		}
	};

	return {
		uploadImage,
		updateProfilePicture,
		deleteImage,
		isUploading,
		uploadError,
	};
};
