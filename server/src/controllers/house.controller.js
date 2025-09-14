import { House } from "../models/house.model.js";

export const getHouse = async (req, res) => {
	const { houseCode } = req.params;

	try {
		const house = await House.findOne({ houseCode });
		res.status(200).json({ house });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

export const createHouse = async (req, res) => {
	const { houseCode, name } = req.body;

	try {
		const house = new House({ houseCode, name });
		await house.save();

		res.status(201).json({ house });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};


export const addItemToHouse = async (req, res) => {
	const { houseCode } = req.params;
	const { itemId } = req.body;

	try {
		const house = await House.findOne({ houseCode });

		if (house) {
			house.items.push(itemId);
			await house.save();
			res.status(200).json({ house });
		} else {
			res.status(404).json({ error: "House not found" });
		}
	} catch (error) {
		res.status(500).json({ error: error });
	}
};
