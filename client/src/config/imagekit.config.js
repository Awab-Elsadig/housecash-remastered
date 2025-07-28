import ImageKit from "imagekit-javascript";

// Initialize ImageKit instance for client-side usage
const imagekit = new ImageKit({
	publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
	urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
});

export default imagekit;
