import React, { useEffect, useRef, useState, useCallback } from "react";
import classes from "./AddItem.module.css";
import { useUser } from "../../hooks/useUser";
import axios from "axios";
import { IoCloseSharp } from "react-icons/io5";
import socket from "../../socketConfig";

// Arrays for different categories (moved outside component)
const groceryProducts = [
	{ title: "Milk", price: 50, description: "A gallon of milk" },
	{ title: "Bread", price: 30, description: "A loaf of bread" },
	{ title: "Eggs", price: 45, description: "A dozen eggs" },
	{ title: "Cheese", price: 75, description: "A block of cheese" },
	{ title: "Butter", price: 60, description: "A pound of butter" },
	{ title: "Chicken", price: 150, description: "A whole chicken" },
	{ title: "Beef", price: 225, description: "A pound of beef" },
	{ title: "Fish", price: 180, description: "A pound of fish" },
	{ title: "Vegetables", price: 120, description: "A variety of vegetables" },
	{ title: "Fruits", price: 150, description: "A variety of fruits" },
	{ title: "Cereal", price: 90, description: "A box of cereal" },
	{ title: "Juice", price: 75, description: "A bottle of juice" },
	{ title: "Coffee", price: 120, description: "A bag of coffee" },
	{ title: "Tea", price: 60, description: "A box of tea" },
	{ title: "Pasta", price: 45, description: "A pack of pasta" },
];

const footballProducts = [
	{ title: "Football", price: 300, description: "A standard football" },
	{ title: "Football Jersey", price: 750, description: "A team jersey" },
	{ title: "Football Boots", price: 1500, description: "A pair of football boots" },
	{ title: "Goalkeeper Gloves", price: 600, description: "A pair of goalkeeper gloves" },
	{ title: "Shin Guards", price: 375, description: "A pair of shin guards" },
	{ title: "Football Shorts", price: 450, description: "A pair of football shorts" },
	{ title: "Football Socks", price: 225, description: "A pair of football socks" },
	{ title: "Training Cones", price: 525, description: "A set of training cones" },
	{ title: "Water Bottle", price: 150, description: "A water bottle" },
	{ title: "Football Net", price: 2250, description: "A football net" },
	{ title: "Training Bibs", price: 300, description: "A set of training bibs" },
	{ title: "Football Pump", price: 225, description: "A football pump" },
	{ title: "Captain Armband", price: 150, description: "A captain armband" },
	{ title: "Whistle", price: 75, description: "A referee whistle" },
	{ title: "Football Bag", price: 600, description: "A football bag" },
];

const gamingProducts = [
	{ title: "Gaming Console", price: 4500, description: "A gaming console" },
	{ title: "Game Controller", price: 900, description: "A game controller" },
	{ title: "Gaming Headset", price: 1200, description: "A gaming headset" },
	{ title: "Gaming Chair", price: 3000, description: "A gaming chair" },
	{ title: "Gaming Mouse", price: 750, description: "A gaming mouse" },
	{ title: "Gaming Keyboard", price: 1500, description: "A gaming keyboard" },
	{ title: "Gaming Monitor", price: 3750, description: "A gaming monitor" },
	{ title: "VR Headset", price: 6000, description: "A VR headset" },
	{ title: "Gaming Desk", price: 2250, description: "A gaming desk" },
	{ title: "Gaming Speakers", price: 1800, description: "A set of gaming speakers" },
	{ title: "Gaming Laptop", price: 22500, description: "A gaming laptop" },
	{ title: "Gaming PC", price: 30000, description: "A gaming PC" },
	{ title: "Gaming Mouse Pad", price: 450, description: "A gaming mouse pad" },
	{ title: "Streaming Camera", price: 1500, description: "A streaming camera" },
	{ title: "Capture Card", price: 2250, description: "A capture card" },
];

const cosmeticsProducts = [
	{ title: "Lipstick", price: 225, description: "A red lipstick" },
	{ title: "Foundation", price: 450, description: "A foundation" },
	{ title: "Mascara", price: 300, description: "A mascara" },
	{ title: "Eyeshadow Palette", price: 750, description: "An eyeshadow palette" },
	{ title: "Blush", price: 375, description: "A blush" },
	{ title: "Highlighter", price: 525, description: "A highlighter" },
	{ title: "Concealer", price: 300, description: "A concealer" },
	{ title: "Setting Spray", price: 375, description: "A setting spray" },
	{ title: "Makeup Brushes", price: 600, description: "A set of makeup brushes" },
	{ title: "Nail Polish", price: 225, description: "A nail polish" },
	{ title: "Perfume", price: 900, description: "A bottle of perfume" },
	{ title: "Face Mask", price: 150, description: "A face mask" },
	{ title: "Moisturizer", price: 450, description: "A moisturizer" },
	{ title: "Serum", price: 750, description: "A face serum" },
	{ title: "Sunscreen", price: 375, description: "A sunscreen" },
];

const AddItem = ({ setAddItem, itemToEdit }) => {
	const { user, houseMembers, fetchItems, items, updateItems } = useUser();
	const [selectedMembers, setSelectedMembers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showPopup, setShowPopup] = useState(false);
	const [popupMsg, setPopupMsg] = useState("");
	const first = useRef();

	// Local state for form fields
	const [itemName, setItemName] = useState("");
	const [itemPrice, setItemPrice] = useState("");
	const [itemDescription, setItemDescription] = useState("");

	// Trigger phrases logic remains unchanged
	const triggerMap = {
		"waleed waleed waleed": {
			popup: "Elbolga is an OG",
			fetchData: async () => {
				const product = footballProducts[Math.floor(Math.random() * footballProducts.length)];
				return product;
			},
		},
		"dirar dirar dirar": {
			popup: "Dirar is unstoppable!",
			fetchData: async () => {
				const product = gamingProducts[Math.floor(Math.random() * gamingProducts.length)];
				return product;
			},
		},
		"ansari ansari ansari": {
			popup: "Ansari is the MVP!",
			fetchData: async () => {
				const product = cosmeticsProducts[Math.floor(Math.random() * cosmeticsProducts.length)];
				return product;
			},
		},
		creator: {
			popup: "Created by Awab!",
			fetchData: async () => {
				const product = groceryProducts[Math.floor(Math.random() * groceryProducts.length)];
				return product;
			},
		},
	};

	// Populate form with random data (available in both modes)
	const generateRandomData = useCallback(async () => {
		const product = groceryProducts[Math.floor(Math.random() * groceryProducts.length)];
		setItemName(product.title || "Random Item");
		setItemPrice(product.price || 0);
		setItemDescription(product.description || "Randomly generated description");
		setPopupMsg("Random data generated!");
		setShowPopup(true);
		setTimeout(() => {
			setShowPopup(false);
		}, 3000);
	}, []);

	// onChange for itemName: detect special triggers with debounce
	const handleNameChange = (e) => {
		const newValue = e.target.value;
		setItemName(newValue);

		const key = newValue.trim().toLowerCase();
		if (triggerMap[key]) {
			clearTimeout(handleNameChange.timeout);
			handleNameChange.timeout = setTimeout(async () => {
				const { popup, fetchData } = triggerMap[key];
				try {
					const { title, price, description } = await fetchData();
					setItemName(title);
					setItemPrice(price);
					setItemDescription(description);
					setPopupMsg(popup);
					setShowPopup(true);
					setTimeout(() => {
						setShowPopup(false);
					}, 3000);
				} catch {
					// Error fetching data for trigger
				}
			}, 200);
		}
	};

	// Listen for Ctrl+R globally
	useEffect(() => {
		first.current.focus();
		const handleKeyDown = (e) => {
			if (e.ctrlKey && e.key === "r") {
				e.preventDefault();
				generateRandomData();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [generateRandomData]);

	// Prepopulate fields if editing and when houseMembers are available
	useEffect(() => {
		if (itemToEdit) {
			setItemName(itemToEdit.name || "");
			setItemPrice(itemToEdit.price || "");
			setItemDescription(itemToEdit.description || "");
			if (houseMembers && houseMembers.length > 0) {
				const preSelected = houseMembers.filter((member) => itemToEdit.members.some((m) => m.userID === member._id));
				setSelectedMembers(preSelected);
			}
		}
	}, [itemToEdit, houseMembers]);

	// Toggle member selection for individual buttons
	const toggleMember = (member) => {
		if (selectedMembers.some((m) => m._id === member._id)) {
			setSelectedMembers(selectedMembers.filter((m) => m._id !== member._id));
		} else {
			setSelectedMembers([...selectedMembers, member]);
		}
	};

	// Toggle select/deselect all participants
	const toggleSelectAll = () => {
		if (houseMembers) {
			if (selectedMembers.length === houseMembers.length) {
				setSelectedMembers([]);
			} else {
				setSelectedMembers(houseMembers);
			}
		}
	};

	// Submit handler: Create new item or update existing one
	const handleSubmit = async (e) => {
		e.preventDefault();

		if (selectedMembers.length === 0) {
			setPopupMsg("Please select at least one participant.");
			setShowPopup(true);
			setTimeout(() => {
				setShowPopup(false);
			}, 3000);
			return;
		}

		setLoading(true);
		// Build the members array and mark the payer as paid
		const { payer } = e.target;
		const members = selectedMembers.map((member) => ({
			userID: member._id,
			paid: false,
			got: false, // ensure the got property is set
		}));
		const updatedMembers = members.map((member) =>
			member.userID === payer.value ? { ...member, paid: true, got: true } : member
		);

		if (itemToEdit) {
			// --- EDIT MODE: Update the existing item ---
			const updatedMembersMerged = selectedMembers.map((member) => {
				const existing = itemToEdit.members.find((m) => m.userID.toString() === member._id);
				return existing ? existing : { userID: member._id, paid: false, got: false };
			});
			const finalMembers = updatedMembersMerged.map((member) =>
				member.userID === payer.value ? { ...member, paid: true } : member
			);

			const updatedItem = {
				...itemToEdit,
				name: itemName,
				price: itemPrice,
				description: itemDescription,
				members: finalMembers,
				author: payer.value,
			};

			try {
				const response = await axios.patch(`/api/items/update-item/${itemToEdit._id}`, updatedItem);
				const updatedItemFromServer = response.data.item;
				const updatedItems = items.map((item) =>
					item._id === updatedItemFromServer._id ? updatedItemFromServer : item
				);
				updateItems(updatedItems);
				setAddItem(false);
				socket.emit("SendFetch");
			} catch (error) {
				console.error("Error updating item:", error);
			}
		} else {
			// --- ADD MODE: Create a new item ---
			const newItem = {
				name: itemName,
				price: itemPrice,
				description: itemDescription,
				members: updatedMembers,
				createdBy: user._id,
				author: payer.value,
			};

			try {
				const response = await axios.post("/api/items/create-item", newItem);
				const createdItem = response.data.item;
				updateItems([...items, createdItem]);
				setAddItem(false);
				socket.emit("SendFetch");
			} catch (error) {
				console.error("Error adding item:", error);
			}
		}

		setLoading(false);
	};

	// Close form when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (!document.querySelector(`.${classes.addItem}`)?.contains(event.target)) {
				setAddItem(false);
				fetchItems();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [setAddItem, fetchItems]);

	return (
		<div className={classes.modalBG}>
			<div className={classes.addItem}>
				<div className={classes.top}>
					<h1>{itemToEdit ? "Edit Item" : "Add New Item"}</h1>
					<IoCloseSharp className={classes.closeBtn} onClick={() => setAddItem(false)} />
				</div>
				<form onSubmit={handleSubmit} className={classes.addForm}>
					<div className={classes.inputGroup}>
						<label htmlFor="itemName">Item Name *</label>
						<input
							type="text"
							name="itemName"
							placeholder="Eg. Groceries"
							required
							value={itemName}
							onChange={handleNameChange}
							ref={first}
						/>
					</div>

					<div className={classes.inputGroup}>
						<label htmlFor="itemPrice">Item Price *</label>
						<input
							type="number"
							name="itemPrice"
							placeholder="Eg. 342"
							required
							value={itemPrice}
							onChange={(e) => setItemPrice(e.target.value)}
						/>
					</div>

					<div className={classes.inputGroup}>
						<label htmlFor="itemDescription">Item Description (Optional)</label>
						<input
							type="text"
							name="itemDescription"
							placeholder="Eg. Some Groceries for the house."
							value={itemDescription}
							onChange={(e) => setItemDescription(e.target.value)}
						/>
					</div>

					{/* Participants section with select/deselect all */}
					<div className={classes.inputGroup}>
						<div className={classes.participantsHeader}>
							<label>Select Participants *</label>
							<button type="button" onClick={toggleSelectAll} className={classes.selectAll}>
								{houseMembers && selectedMembers.length === houseMembers.length ? "Deselect All" : "Select All"}
							</button>
						</div>
						<div className={classes.members}>
							{houseMembers ? (
								houseMembers.map((member) => (
									<button
										key={member._id}
										type="button"
										className={
											selectedMembers.some((m) => m._id === member._id)
												? classes.selectedMember
												: classes.unselectedMember
										}
										onClick={() => toggleMember(member)}
									>
										{member.name.split(" ")[0]}
									</button>
								))
							) : (
								<p>No house members found.</p>
							)}
						</div>
					</div>

					<div className={classes.inputGroup}>
						<label htmlFor="payer">Payer *</label>
						<select className={classes.payerList} name="payer" defaultValue={user._id} required>
							{houseMembers &&
								houseMembers.map((member) => (
									<option key={member._id} value={member._id}>
										{member.name.split(" ")[0]}
									</option>
								))}
						</select>
					</div>

					<button className={classes.submitButton} type="submit">
						{loading ? (itemToEdit ? "Updating..." : "Adding...") : itemToEdit ? "Update Item" : "Add Item"}
					</button>
				</form>
			</div>
			{showPopup && <div className={classes.popup}>{popupMsg}</div>}
		</div>
	);
};

export default AddItem;
