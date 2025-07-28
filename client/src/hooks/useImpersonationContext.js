import { useContext } from "react";
import { ImpersonationContext } from "../contexts/ImpersonationContext";

export const useImpersonationContext = () => {
	const context = useContext(ImpersonationContext);
	if (!context) {
		throw new Error("useImpersonationContext must be used within an ImpersonationProvider");
	}
	return context;
};
