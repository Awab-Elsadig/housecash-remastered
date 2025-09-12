import React, { useEffect } from "react";

const NotFound = () => {
	useEffect(() => {
		document.title = "Page Not Found - HouseCash";
	}, []);

	return (
		<div className="not-found-page">
			<h1>404 - Page Not Found</h1>
			<p>The page you're looking for doesn't exist.</p>
		</div>
	);
};

export default NotFound;
