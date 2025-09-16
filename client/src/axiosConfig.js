import axios from "axios";

// Environment setup

// Set the base URL for all axios requests
const getApiUrl = () => {
	// In production, use the environment variable or default to Vercel backend
	if (import.meta.env.PROD) {
		return import.meta.env.VITE_API_URL || "https://housecash-server.vercel.app";
	}
	// In development, use localhost
	return import.meta.env.VITE_API_URL || "http://localhost:4000";
};

axios.defaults.baseURL = getApiUrl();

// Include cookies in all requests
axios.defaults.withCredentials = true;

// Request interceptor
axios.interceptors.request.use(
	(config) => {
		return config;
	},
	(error) => {
		console.error("Axios request error:", error);
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
			// RouteProtection component will handle redirects
			// Don't automatically redirect here to avoid conflicts
		}
		return Promise.reject(error);
	}
);

export default axios;
