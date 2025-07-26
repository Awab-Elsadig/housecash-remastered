import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";

export const checkHouseCode = async (req, res) => {
	const { houseCode } = req.body;

	try {
		const house = await House.findOne({ houseCode });

		if (house) {
			return res.json({ exists: true });
		}

		res.json({ exists: false });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

export const checkEmail = async (req, res) => {
	const { email } = req.body;

	try {
		const user = await User.findOne({ email });

		if (user) {
			return res.json({ exists: true });
		}

		res.json({ exists: false });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};
