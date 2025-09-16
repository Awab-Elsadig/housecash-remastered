// Custom hook for user data management
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useImpersonationContext } from "./useImpersonationContext";

export const useUser = () => {
	const [user, setUser] = useState(null);
	const [houseMembers, setHouseMembers] = useState([]);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isFetchingUser, setIsFetchingUser] = useState(false);
	const [isFetchingItems, setIsFetchingItems] = useState(false);
	const [hasInitializedItems, setHasInitializedItems] = useState(false);
	const [refreshCounter, setRefreshCounter] = useState(0);
	const { isImpersonating } = useImpersonationContext();

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
		// Prevent duplicate calls using sessionStorage as a global flag
		const isCurrentlyFetching = sessionStorage.getItem("isFetchingUser");
		if (isCurrentlyFetching === "true") {
			return;
		}
		
		sessionStorage.setItem("isFetchingUser", "true");
		setIsFetchingUser(true);
		setError(null);

		try {
			const response = await axios.get("/api/users/me", {
				withCredentials: true,
			});
			if (response.data) {
				// Always update during impersonation, otherwise only update if data changed
				const currentUser = JSON.parse(sessionStorage.getItem("user") || "null");
				if (isImpersonating || !currentUser || currentUser._id !== response.data._id || currentUser.name !== response.data.name) {
					updateUser(response.data);
					console.log("✓ User data updated:", response.data.name);
				}
				
				// Update the last fetch timestamp
				sessionStorage.setItem("lastUserFetch", Date.now().toString());

				// Also fetch house members if we have a house code and they're not cached
				if (response.data.houseCode) {
					const cachedMembers = sessionStorage.getItem("houseMembers");
					if (!cachedMembers) {
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
			}
		} catch (error) {
			console.error("Error fetching current user:", error);
			setError(error.response?.data?.error || "Failed to fetch current user");
		} finally {
			// Add a small delay before clearing the flag to prevent race conditions
			setTimeout(() => {
				sessionStorage.removeItem("isFetchingUser");
			}, 100);
			setIsFetchingUser(false);
		}
	}, [updateUser, updateHouseMembers, isImpersonating]);

	// Initialize user data from session storage on mount
	useEffect(() => {
		// Don't try to fetch user data on login page
		if (window.location.pathname === "/" || window.location.pathname === "/login") {
			setLoading(false);
			return;
		}

		// Try to load from session storage first for instant display
		const cachedUser = sessionStorage.getItem("user");
		const cachedHouseMembers = sessionStorage.getItem("houseMembers");
		
		if (cachedUser) {
			try {
				const userData = JSON.parse(cachedUser);
				setUser(userData);
			} catch (e) {
				console.error("Failed to parse cached user data:", e);
			}
		}
		
		if (cachedHouseMembers) {
			try {
				const membersData = JSON.parse(cachedHouseMembers);
				setHouseMembers(membersData);
			} catch (e) {
				console.error("Failed to parse cached house members:", e);
			}
		}

		// Only fetch fresh data if we don't have cached data, if it's been more than 5 minutes, or if impersonating
		const lastFetch = sessionStorage.getItem("lastUserFetch");
		const now = Date.now();
		const fiveMinutes = 5 * 60 * 1000;
		
		if (!cachedUser || !lastFetch || (now - parseInt(lastFetch)) > fiveMinutes || isImpersonating) {
			// Only log if we're actually going to fetch (not already fetching)
			const isCurrentlyFetching = sessionStorage.getItem("isFetchingUser");
			if (isCurrentlyFetching !== "true") {
				console.log("✓ Fetching fresh user data");
			}
			fetchCurrentUser();
		}

	// Listen for impersonation events to refresh data
	const handleImpersonationStart = () => {
		console.log("✓ Impersonation started: Clearing cache and fetching fresh data");
		sessionStorage.removeItem("lastUserFetch");
		setHasInitializedItems(false);
		// Clear all cached data to force fresh fetch
		sessionStorage.removeItem("user");
		sessionStorage.removeItem("houseMembers");
		sessionStorage.removeItem("items");
		// Force refresh counter to trigger component re-renders
		setRefreshCounter(prev => prev + 1);
		// Fetch fresh data
		fetchCurrentUser();
	};

	const handleImpersonationStop = () => {
		console.log("✓ Impersonation stopped: Clearing cache and fetching fresh data");
		sessionStorage.removeItem("lastUserFetch");
		setHasInitializedItems(false);
		// Clear all cached data to force fresh fetch
		sessionStorage.removeItem("user");
		sessionStorage.removeItem("houseMembers");
		sessionStorage.removeItem("items");
		// Force re-render of all components
		setRefreshCounter(prev => prev + 1);
		// Force immediate refresh
		setTimeout(() => {
			fetchCurrentUser();
		}, 50);
	};

		// Handle force data refresh
		const handleForceDataRefresh = () => {
			console.log("✓ Force refreshing all data");
			// Clear all cached data
			sessionStorage.removeItem("user");
			sessionStorage.removeItem("houseMembers");
			sessionStorage.removeItem("items");
			sessionStorage.removeItem("lastUserFetch");
			sessionStorage.removeItem("isFetchingUser");
			sessionStorage.removeItem("isFetchingItems");
			// Force refresh
			setRefreshCounter(prev => prev + 1);
			setHasInitializedItems(false);
			// Fetch fresh data
			fetchCurrentUser();
		};

		// Handle navigation-like data loading (same as when navigating to any page)
		const handleNavigateToPage = (event) => {
			const { forceRefresh } = event.detail || {};
			console.log("✓ Starting navigation-like data loading process", { forceRefresh });
			
			// Step 1: Load from session storage first (like navigation does)
			const cachedUser = sessionStorage.getItem("user");
			const cachedHouseMembers = sessionStorage.getItem("houseMembers");
			const cachedItems = sessionStorage.getItem("items");
			
			if (cachedUser && !forceRefresh) {
				try {
					const userData = JSON.parse(cachedUser);
					setUser(userData);
					console.log("✓ Loaded user from cache:", userData.name);
				} catch (e) {
					console.error("Failed to parse cached user data:", e);
				}
			}
			
			if (cachedHouseMembers && !forceRefresh) {
				try {
					const membersData = JSON.parse(cachedHouseMembers);
					setHouseMembers(membersData);
				} catch (e) {
					console.error("Failed to parse cached house members:", e);
				}
			}
			
			if (cachedItems && !forceRefresh) {
				try {
					const itemsData = JSON.parse(cachedItems);
					setItems(itemsData);
					console.log("✓ Loaded items from cache:", itemsData.length, "items");
				} catch (e) {
					console.error("Failed to parse cached items:", e);
				}
			}
			
			// Step 2: Fetch fresh data from server (like navigation does)
			const lastFetch = sessionStorage.getItem("lastUserFetch");
			const now = Date.now();
			const fiveMinutes = 5 * 60 * 1000;
			
			if (forceRefresh || !cachedUser || !lastFetch || (now - parseInt(lastFetch)) > fiveMinutes) {
				console.log("✓ Fetching fresh user data from server");
				fetchCurrentUser();
			}
			
			// Step 3: Force refresh counter to trigger component re-renders
			setRefreshCounter(prev => prev + 1);
			setHasInitializedItems(false);
		};

		window.addEventListener('impersonationStarted', handleImpersonationStart);
		window.addEventListener('impersonationStopped', handleImpersonationStop);
		window.addEventListener('forceDataRefresh', handleForceDataRefresh);
		window.addEventListener('navigateToPage', handleNavigateToPage);
		
		return () => {
			window.removeEventListener('impersonationStarted', handleImpersonationStart);
			window.removeEventListener('impersonationStopped', handleImpersonationStop);
			window.removeEventListener('forceDataRefresh', handleForceDataRefresh);
			window.removeEventListener('navigateToPage', handleNavigateToPage);
		};
	}, [fetchCurrentUser, isImpersonating]);

	// Fetch items from backend
	const fetchItems = useCallback(async () => {
		if (!user?.houseCode) {
			return;
		}

		// Prevent duplicate calls using sessionStorage as a global flag
		const isCurrentlyFetchingItems = sessionStorage.getItem("isFetchingItems");
		if (isCurrentlyFetchingItems === "true") {
			return;
		}

		sessionStorage.setItem("isFetchingItems", "true");
		setIsFetchingItems(true);
		setLoading(true);
		setError(null);

		try {
			console.log("✓ Fetching items from server");
			const response = await axios.get("/api/items/get-items");
			if (response.data?.items) {
				updateItems(response.data.items);
			}
		} catch (error) {
			console.error("Error fetching items:", error);
			setError(error.response?.data?.error || "Failed to fetch items");
		} finally {
			setLoading(false);
			// Add a small delay before clearing the flag to prevent race conditions
			setTimeout(() => {
				sessionStorage.removeItem("isFetchingItems");
			}, 100);
			setIsFetchingItems(false);
		}
	}, [user?.houseCode, updateItems]);

	// Auto-fetch items when user data becomes available (only if not cached)
	useEffect(() => {
		if (user?.houseCode && user?._id && !hasInitializedItems) {
			setHasInitializedItems(true);
			const cachedItems = sessionStorage.getItem("items");
			if (!cachedItems) {
				fetchItems();
			} else {
				// Load from cache for instant display
				try {
					const itemsData = JSON.parse(cachedItems);
					setItems(itemsData);
				} catch (e) {
					console.error("Failed to parse cached items:", e);
					fetchItems(); // Fallback to server fetch
				}
			}
		}
	}, [user?.houseCode, hasInitializedItems]);

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
			setError(null);

			// Optimistic update - add item immediately to UI
			const optimisticItem = {
				...itemData,
				_id: `temp_${Date.now()}`, // Temporary ID
				createdBy: user?._id,
				author: user?._id,
				createdAt: new Date().toISOString(),
				isOptimistic: true
			};
			
			const newItems = [...items, optimisticItem];
			setItems(newItems);
			updateItems(newItems);

			try {
				const response = await axios.post("/api/items/create-item", {
					...itemData,
					createdBy: user?._id,
					author: user?._id,
				});

				if (response.data?.item) {
					// Replace optimistic item with real item
					const updatedItems = items.map(item => 
						item._id === optimisticItem._id ? response.data.item : item
					);
					setItems(updatedItems);
					updateItems(updatedItems);
					return response.data.item;
				}
			} catch (error) {
				console.error("Error creating item:", error);
				// Revert optimistic update on error
				const revertedItems = items.filter(item => item._id !== optimisticItem._id);
				setItems(revertedItems);
				updateItems(revertedItems);
				setError(error.response?.data?.error || "Failed to create item");
				throw error;
			}
		},
		[user, items, updateItems]
	);

	// Update an existing item
	const updateItem = useCallback(
		async (itemId, itemData) => {
			setError(null);

			// Optimistic update - update item immediately in UI
			const originalItems = [...items];
			const updatedItems = items.map(item => 
				item._id === itemId ? { ...item, ...itemData } : item
			);
			setItems(updatedItems);
			updateItems(updatedItems);

			try {
				const response = await axios.patch(`/api/items/update-item/${itemId}`, {
					...itemData,
					author: user?._id,
				});

				if (response.data?.item) {
					// Replace with server response
					const finalItems = items.map(item => 
						item._id === itemId ? response.data.item : item
					);
					setItems(finalItems);
					updateItems(finalItems);
					return response.data.item;
				}
			} catch (error) {
				console.error("Error updating item:", error);
				// Revert optimistic update on error
				setItems(originalItems);
				updateItems(originalItems);
				setError(error.response?.data?.error || "Failed to update item");
				throw error;
			}
		},
		[user, items, updateItems]
	);

	// Delete an item
	const deleteItem = useCallback(
		async (itemId) => {
			if (!user?._id || !user?.houseCode) {
				setError("User information not available");
				return;
			}

			setError(null);

			// Optimistic update - remove item immediately from UI
			const originalItems = [...items];
			const updatedItems = items.filter(item => item._id !== itemId);
			setItems(updatedItems);
			updateItems(updatedItems);

			try {
				await axios.delete(`/api/items/delete-item/${user.houseCode}/${user._id}/${itemId}`);
			} catch (error) {
				console.error("Error deleting item:", error);
				// Revert optimistic update on error
				setItems(originalItems);
				updateItems(originalItems);
				setError(error.response?.data?.error || "Failed to delete item");
				throw error;
			}
		},
		[user, items, updateItems]
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
			
			// Dispatch logout event for RouteProtection to handle
			window.dispatchEvent(new CustomEvent('userLogout'));
		}
	}, []);

	// Clear error
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Force refresh data (for Ably updates)
	const forceRefresh = useCallback(async () => {
		console.log("Force refreshing all data due to external update");
		await fetchCurrentUser();
		if (user?.houseCode) {
			await fetchItems();
		}
	}, [fetchCurrentUser, fetchItems, user?.houseCode]);

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
		forceRefresh,
		refreshTrigger: refreshCounter,
	};
};
