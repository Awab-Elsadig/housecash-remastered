import React, { useState } from "react";
import classes from "./DeleteConfirmation.module.css";

const DeleteConfirmation = ({ setDeleteConfirmation, itemToDelete, onItemDeleted, deleteItem }) => {
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState(null);

	const handleDelete = async () => {
		if (!itemToDelete?._id) {
			console.error("No item ID provided");
			setError("No item ID provided");
			return;
		}

		if (!deleteItem) {
			console.error("Delete function not provided");
			setError("Delete function not available");
			return;
		}

		setIsDeleting(true);
		setError(null); // Clear any previous errors

		try {
			await deleteItem(itemToDelete._id);

			// Refresh the items list
			if (onItemDeleted) {
				onItemDeleted();
			}

			console.log("Item deleted successfully");
			setDeleteConfirmation(false);

			// You might want to emit a socket event to notify other users
			// socket.emit("itemDeleted", { itemId: itemToDelete._id });
		} catch (error) {
			console.error("Delete failed:", error);
			setError(error.message || "Failed to delete item. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCancel = () => {
		setError(null); // Clear any errors
		setDeleteConfirmation(false);
	};

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			setError(null); // Clear any errors
			setDeleteConfirmation(false);
		}
	};

	if (!itemToDelete) return null;

	return (
		<div className={classes.overlay} onClick={handleBackdropClick}>
			<div className={classes.modal}>
				<div className={classes.header}>
					<h2>Delete Expense</h2>
				</div>

				<div className={classes.content}>
					{error && (
						<div className={classes.error}>
							<div className={classes.errorIcon}>❌</div>
							<p>{error}</p>
						</div>
					)}

					<div className={classes.warning}>
						<div className={classes.warningIcon}>⚠️</div>
						<p>Are you sure you want to delete this expense?</p>
					</div>

					<div className={classes.itemDetails}>
						<div className={classes.itemName}>
							<strong>{itemToDelete.name}</strong>
						</div>
						<div className={classes.itemAmount}>${itemToDelete.price?.toFixed(2) || "0.00"}</div>
						<div className={classes.itemDate}>
							{itemToDelete.createdAt && new Date(itemToDelete.createdAt).toLocaleDateString()}
						</div>
					</div>

					<div className={classes.warningText}>
						<p>
							This action cannot be undone. The expense will be permanently removed and all associated payment records
							will be deleted.
						</p>
					</div>
				</div>

				<div className={classes.actions}>
					<button className={classes.cancelButton} onClick={handleCancel} disabled={isDeleting}>
						Cancel
					</button>
					<button className={classes.deleteButton} onClick={handleDelete} disabled={isDeleting}>
						{isDeleting ? "Deleting..." : "Delete Expense"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default DeleteConfirmation;
