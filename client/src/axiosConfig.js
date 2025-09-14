import axios from "axios";

// Debug environment variables
console.log("=== ENVIRONMENT DEBUG ===");
console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("NODE_ENV:", import.meta.env.NODE_ENV);
console.log("MODE:", import.meta.env.MODE);
console.log("All env vars:", import.meta.env);
console.log("=== END ENVIRONMENT DEBUG ===");

// Set the base URL for all axios requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
console.log("Axios baseURL set to:", axios.defaults.baseURL);

// Include cookies in all requests
axios.defaults.withCredentials = true;
console.log("Axios withCredentials set to:", axios.defaults.withCredentials);

// Request interceptor
axios.interceptors.request.use(
	(config) => {
		console.log("=== AXIOS REQUEST DEBUG ===");
		console.log("Request URL:", config.url);
		console.log("Request method:", config.method);
		console.log("Request baseURL:", config.baseURL);
		console.log("Full URL:", `${config.baseURL}${config.url}`);
		console.log("Request data:", config.data);
		console.log("Request headers:", config.headers);
		console.log("With credentials:", config.withCredentials);
		
		// JWT token is automatically sent via HTTP-only cookie
		// No need to manually attach it to headers
		console.log("Using cookie-based authentication");
		
		console.log("=== END AXIOS REQUEST DEBUG ===");
		return config;
	},
	(error) => {
		console.error("Axios request interceptor error:", error);
		return Promise.reject(error);
	}
);

// Response interceptor
axios.interceptors.response.use(
	(response) => {
		console.log("=== AXIOS RESPONSE DEBUG ===");
		console.log("Response status:", response.status);
		console.log("Response statusText:", response.statusText);
		console.log("Response data:", response.data);
		console.log("Response headers:", response.headers);
		console.log("Response config URL:", response.config.url);
		console.log("=== END AXIOS RESPONSE DEBUG ===");
		return response;
	},
	(error) => {
		console.log("=== AXIOS RESPONSE ERROR DEBUG ===");
		console.log("Error:", error);
		console.log("Error message:", error.message);
		console.log("Error code:", error.code);
		console.log("Error response:", error.response);
		if (error.response) {
			console.log("Error response status:", error.response.status);
			console.log("Error response statusText:", error.response.statusText);
			console.log("Error response data:", error.response.data);
			console.log("Error response headers:", error.response.headers);
		}
		console.log("Error config:", error.config);
		console.log("=== END AXIOS RESPONSE ERROR DEBUG ===");
		
		// Handle common errors here
		if (error.response?.status === 401) {
			console.log("401 Unauthorized - RouteProtection will handle redirect");
			// RouteProtection component will handle redirects
			// Don't automatically redirect here to avoid conflicts
		}
		return Promise.reject(error);
	}
);

export default axios;
