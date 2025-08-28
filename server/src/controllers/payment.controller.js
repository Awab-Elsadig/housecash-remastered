import Payment from "../models/payment.model.js";

// @desc    Get all payments for the user's house
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
	try {
		const payments = await Payment.find({ houseCode: req.user.houseCode })
			.populate("fromUser", "name")
			.populate("toUser", "name")
			.populate({
				path: "settledItemIds",
				select: "name price",
			})
			.populate("settledItemId", "name price")
			.sort({ createdAt: -1 });

		res.status(200).json(payments);
	} catch (error) {
		console.error("Error fetching payments:", error);
		res.status(500).json({ message: "Server error while fetching payments." });
	}
};

export default getPayments;
