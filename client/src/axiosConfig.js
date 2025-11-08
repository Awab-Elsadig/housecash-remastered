import axios from "axios";

// Environment setup

// Set the base URL for all axios requests
const getApiUrl = () => {
	// In production, use the environment variable or default to Vercel backend
	if (import.meta.env.PROD) {
		return import.meta.env.VITE_API_URL || "https://housecash-server.vercel.app";
	}
	// In development, use localhost (server runs on port 5000)
	return import.meta.env.VITE_API_URL || "http://localhost:5000";
};

const apiUrl = getApiUrl();
axios.defaults.baseURL = apiUrl;

// Include cookies in all requests
axios.defaults.withCredentials = true;

// Request interceptor
axios.interceptors.request.use(
	(config) => {
		return config;
	},
	(error) => {
		// Only log unexpected request errors
		if (import.meta.env.DEV && !error.config?.url?.includes("/api/users/me")) {
			console.error("Axios request error:", error);
		}
		return Promise.reject(error);
	}
);

// Response interceptor
axios.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// Suppress 401 errors - they're expected during auth checks
		// RouteProtection and Login components handle these gracefully
		if (error.response?.status === 401) {
			// Silent - expected behavior during auth checks
			// Still reject the promise so components can handle it gracefully
			return Promise.reject(error);
		}
		return Promise.reject(error);
	}
);

export default axios;
