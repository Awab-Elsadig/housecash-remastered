// Custom hook for user data management
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export const useUser = () => {
	const [user, setUser] = useState(null);
	const [houseMembers, setHouseMembers] = useState([]);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

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

	// Fetch current user from server (works with impersonation)
	const fetchCurrentUser = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await axios.get("/api/users/me", {
				withCredentials: true,
			});
			if (response.data) {
				updateUser(response.data);

				// Also fetch house members if we have a house code
				if (response.data.houseCode) {
					// Fetch house members using the correct endpoint
					try {
						const houseResponse = await axios.get(`/api/users/get-users-by-house-code/${response.data.houseCode}`);
						if (houseResponse.data?.users) {
							updateHouseMembers(houseResponse.data.users);
						}
					} catch (houseError) {
						console.error("Error fetching house members:", houseError);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching current user:", error);
			setError(error.response?.data?.error || "Failed to fetch current user");
		} finally {
			setLoading(false);
		}
	}, [updateUser, updateHouseMembers]);

	// Initialize user data from session storage on mount
	useEffect(() => {
		// Don't try to fetch user data on login page
		if (window.location.pathname === "/" || window.location.pathname === "/login") {
			setLoading(false);
			return;
		}

		// Always fetch fresh data from server to handle impersonation properly
		fetchCurrentUser();
	}, [fetchCurrentUser]);

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
				// Items are already filtered by house code on the backend
				updateItems(response.data.items);
			}
		} catch (error) {
			console.error("Error fetching items:", error);
			setError(error.response?.data?.error || "Failed to fetch items");
		} finally {
			setLoading(false);
		}
	}, [user?.houseCode, updateItems]);

	// Auto-fetch items when user data becomes available
	useEffect(() => {
		if (user?.houseCode && user?._id) {
			fetchItems();
		}
	}, [user?.houseCode, user?._id, fetchItems]);

	// Fetch user profile
	const fetchUser = useCallback(
		async (userId) => {
			setLoading(true);
			setError(null);

			try {
				const response = await axios.post("/api/users/get-user", { _id: userId });
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
				const response = await axios.get(`/api/users/get-users-by-house-code/${houseCode}`);
				if (response.data?.users) {
					updateHouseMembers(response.data.users);
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
					author: user?._id,
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
					author: user?._id,
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
				const response = await axios.put(`/api/users/update-user/${userId}`, updateData);
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
		fetchCurrentUser,
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
