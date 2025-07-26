// Custom hook for user data management
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const useUser = () => {
	const [user, setUser] = useState(null);
	const [houseMembers, setHouseMembers] = useState([]);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Initialize user data from session storage on mount
	useEffect(() => {
		const savedUser = sessionStorage.getItem("user");
		const savedHouseMembers = sessionStorage.getItem("houseMembers");
		const savedItems = sessionStorage.getItem("items");

		if (savedUser) {
			setUser(JSON.parse(savedUser));
		}
		if (savedHouseMembers) {
			setHouseMembers(JSON.parse(savedHouseMembers));
		}
		if (savedItems) {
			setItems(JSON.parse(savedItems));
		}
	}, []);

	// Update user data
	const updateUser = useCallback((userData) => {
		setUser(userData);
		if (userData) {
			sessionStorage.setItem("user", JSON.stringify(userData));
		} else {
			sessionStorage.removeItem("user");
		}
	}, []);

	// Update house members data
	const updateHouseMembers = useCallback((membersData) => {
		setHouseMembers(membersData);
		if (membersData) {
			sessionStorage.setItem("houseMembers", JSON.stringify(membersData));
		} else {
			sessionStorage.removeItem("houseMembers");
		}
	}, []);

	// Update items data
	const updateItems = useCallback((itemsData) => {
		setItems(itemsData);
		if (itemsData) {
			sessionStorage.setItem("items", JSON.stringify(itemsData));
		} else {
			sessionStorage.removeItem("items");
		}
	}, []);

	// Fetch items from backend
	const fetchItems = useCallback(async () => {
		if (!user?.houseCode) {
			console.log("No house code available to fetch items");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await axios.get("/api/items/get-items");
			if (response.data?.items) {
				// Filter items by house code on the frontend
				const houseItems = response.data.items.filter((item) => item.houseCode === user.houseCode);
				updateItems(houseItems);
			}
		} catch (error) {
			console.error("Error fetching items:", error);
			setError(error.response?.data?.error || "Failed to fetch items");
		} finally {
			setLoading(false);
		}
	}, [user?.houseCode, updateItems]); // Fetch user profile
	const fetchUser = useCallback(
		async (userId) => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.post("/api/user/get-user", { _id: userId });
				if (response.data) {
					updateUser(response.data);
				}
			} catch (error) {
				console.error("Error fetching user:", error);
				setError(error.response?.data?.error || "Failed to fetch user");
			} finally {
				setLoading(false);
			}
		},
		[updateUser]
	);

	// Fetch house members
	const fetchHouseMembers = useCallback(
		async (houseCode) => {
			if (!houseCode) return;

			setLoading(true);
			setError(null);

			try {
				const response = await axios.get(`/api/user/get-users-by-house-code/${houseCode}`);
				if (response.data?.members) {
					updateHouseMembers(response.data.members);
				}
			} catch (error) {
				console.error("Error fetching house members:", error);
				setError(error.response?.data?.error || "Failed to fetch house members");
			} finally {
				setLoading(false);
			}
		},
		[updateHouseMembers]
	);

	// Create a new item
	const createItem = useCallback(
		async (itemData) => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.post("/api/items/create-item", {
					...itemData,
					createdBy: user?._id,
					author: user?.name,
				});

				if (response.data?.item) {
					// Refresh items after creating
					await fetchItems();
					return response.data.item;
				}
			} catch (error) {
				console.error("Error creating item:", error);
				setError(error.response?.data?.error || "Failed to create item");
				throw error;
			} finally {
				setLoading(false);
			}
		},
		[user, fetchItems]
	);

	// Update an existing item
	const updateItem = useCallback(
		async (itemId, itemData) => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.patch(`/api/items/update-item/${itemId}`, {
					...itemData,
					author: user?.name,
				});

				if (response.data?.item) {
					// Refresh items after updating
					await fetchItems();
					return response.data.item;
				}
			} catch (error) {
				console.error("Error updating item:", error);
				setError(error.response?.data?.error || "Failed to update item");
				throw error;
			} finally {
				setLoading(false);
			}
		},
		[user, fetchItems]
	);

	// Delete an item
	const deleteItem = useCallback(
		async (itemId) => {
			if (!user?._id || !user?.houseCode) {
				setError("User information not available");
				return;
			}

			setLoading(true);
			setError(null);

			try {
				await axios.delete(`/api/items/delete-item/${user.houseCode}/${user._id}/${itemId}`);
				// Refresh items after deleting
				await fetchItems();
			} catch (error) {
				console.error("Error deleting item:", error);
				setError(error.response?.data?.error || "Failed to delete item");
				throw error;
			} finally {
				setLoading(false);
			}
		},
		[user, fetchItems]
	);

	// Update user profile
	const updateUserProfile = useCallback(
		async (userId, updateData) => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.put(`/api/user/update-user/${userId}`, updateData);
				if (response.data) {
					updateUser(response.data);
					return response.data;
				}
			} catch (error) {
				console.error("Error updating user profile:", error);
				setError(error.response?.data?.error || "Failed to update profile");
				throw error;
			} finally {
				setLoading(false);
			}
		},
		[updateUser]
	);

	// Logout function
	const logout = useCallback(async () => {
		try {
			await axios.post("/api/auth/logout");
		} catch (error) {
			console.error("Error during logout:", error);
		} finally {
			// Clear all data regardless of API response
			setUser(null);
			setHouseMembers([]);
			setItems([]);
			sessionStorage.clear();
		}
	}, []);

	// Clear error
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		// State
		user,
		houseMembers,
		items,
		loading,
		error,

		// User management
		updateUser,
		updateHouseMembers,
		updateItems,
		fetchUser,
		fetchHouseMembers,
		updateUserProfile,
		logout,

		// Item management
		fetchItems,
		createItem,
		updateItem,
		deleteItem,

		// Utility
		clearError,
	};
};
