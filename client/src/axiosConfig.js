import axios from "axios";

// Set the base URL for all axios requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Include cookies in all requests
axios.defaults.withCredentials = true;

// Request interceptor
axios.interceptors.request.use(
	(config) => {
		// You can add auth headers here if needed
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor
axios.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// Handle common errors here
		if (error.response?.status === 401) {
			// Handle unauthorized access
			// Clear session storage and redirect to login
			sessionStorage.clear();
			window.location.href = "/";
		}
		return Promise.reject(error);
	}
);

export default axios;
