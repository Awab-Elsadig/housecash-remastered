import React, { useState } from "react";
import classes from "./AddItemButton.module.css";
import AddItem from "../AddItem/AddItem";

const AddItemButton = () => {
	const [addItem, setAddItem] = useState(false);

	const addItemHandler = () => {
		setAddItem(true);
	};

	return (
		<>
			<button className={classes.addItemButton} onClick={addItemHandler}>
				<span>Add New Item</span>
				<span className={classes.addIcon}>+</span>
			</button>
			{addItem && <AddItem setAddItem={setAddItem} itemToEdit={null} />}
		</>
	);
};

export default AddItemButton;
