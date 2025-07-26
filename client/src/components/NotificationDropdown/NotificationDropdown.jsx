import React, { useState } from "react";
import { IoIosNotifications } from "react-icons/io";

const NotificationDropdown = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [notifications] = useState([]);

	const toggleDropdown = () => {
		setIsOpen(!isOpen);
	};

	return (
		<div style={{ position: "relative" }}>
			<button
				onClick={toggleDropdown}
				style={{
					background: "var(--glassBackground)",
					border: "1px solid var(--glassStroke)",
					borderRadius: "0.5rem",
					padding: "0.5rem",
					color: "var(--textColor)",
					cursor: "pointer",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
				}}
			>
				<IoIosNotifications size={20} />
				{notifications.length > 0 && (
					<span
						style={{
							position: "absolute",
							top: "-5px",
							right: "-5px",
							background: "#ef4444",
							color: "white",
							borderRadius: "50%",
							width: "18px",
							height: "18px",
							fontSize: "10px",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{notifications.length}
					</span>
				)}
			</button>

			{isOpen && (
				<div
					style={{
						position: "absolute",
						top: "100%",
						right: "0",
						marginTop: "0.5rem",
						background: "var(--glassBackground)",
						border: "1px solid var(--glassStroke)",
						borderRadius: "0.5rem",
						padding: "1rem",
						minWidth: "250px",
						maxHeight: "300px",
						overflowY: "auto",
						zIndex: 1000,
						color: "var(--textColor)",
					}}
				>
					{notifications.length > 0 ? (
						notifications.map((notification, index) => (
							<div
								key={index}
								style={{
									padding: "0.5rem",
									borderBottom: "1px solid var(--glassStroke)",
									marginBottom: "0.5rem",
								}}
							>
								{notification.message}
							</div>
						))
					) : (
						<p style={{ margin: 0, textAlign: "center", opacity: 0.7 }}>No new notifications</p>
					)}
				</div>
			)}
		</div>
	);
};

export default NotificationDropdown;
