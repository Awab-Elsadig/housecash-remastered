import React from "react";

const PaymentHistoryWidget = ({ paymentTransactions, paymentStats, user, onShowMore }) => {
	return (
		<div>
			<h3 style={{ marginBottom: "1rem", color: "white" }}>Payment History</h3>

			{paymentStats && Object.keys(paymentStats).length > 0 && (
				<div
					style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(255,255,255,0.1)", borderRadius: "0.5rem" }}
				>
					<h4>Quick Stats</h4>
					<p>Total Payments: {paymentStats.totalPayments || 0}</p>
					<p>Total Amount: ${paymentStats.totalAmount || 0}</p>
				</div>
			)}

			<div style={{ marginBottom: "1rem" }}>
				{paymentTransactions && paymentTransactions.length > 0 ? (
					paymentTransactions.slice(0, 5).map((transaction, index) => (
						<div
							key={index}
							style={{
								padding: "0.5rem",
								marginBottom: "0.5rem",
								background: "rgba(255,255,255,0.1)",
								borderRadius: "0.25rem",
								fontSize: "0.875rem",
							}}
						>
							<div style={{ fontWeight: "bold" }}>${transaction.totalAmount?.toFixed(2) || "0.00"}</div>
							<div style={{ opacity: 0.8 }}>{transaction.paidTo?.name || "Unknown"}</div>
							<div style={{ opacity: 0.6, fontSize: "0.75rem" }}>{transaction.itemCount || 0} items</div>
						</div>
					))
				) : (
					<p style={{ opacity: 0.7 }}>No payment history yet</p>
				)}
			</div>

			<button
				onClick={onShowMore}
				style={{
					width: "100%",
					padding: "0.75rem",
					background: "var(--mainColor)",
					border: "none",
					borderRadius: "0.25rem",
					color: "white",
					cursor: "pointer",
					fontWeight: "600",
				}}
			>
				View Full History
			</button>
		</div>
	);
};

export default PaymentHistoryWidget;
