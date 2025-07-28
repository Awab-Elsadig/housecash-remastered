import axios from "axios";

// Configure axios defaults using environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Add request interceptor for debugging
axios.interceptors.request.use(
	(config) => {
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor for error handling
axios.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error);
	}
);

export default axios;
