// Custom hook for impersonation functionality
import { useState } from "react";

export const useImpersonation = () => {
	const [impersonating, setImpersonating] = useState(null);

	return {
		impersonating,
		setImpersonating,
	};
};
