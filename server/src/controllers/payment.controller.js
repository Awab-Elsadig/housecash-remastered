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

export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Ensure the payment belongs to the same house
        if (String(payment.houseCode) !== String(req.user.houseCode)) {
            return res.status(403).json({ message: "Not authorized to delete this payment" });
        }

        // Basic permission: allow participants (fromUser or toUser) to delete
        const requesterId = String(req.user._id);
        const isParticipant =
            (payment.fromUser && String(payment.fromUser) === requesterId) ||
            (payment.toUser && String(payment.toUser) === requesterId);

        if (!isParticipant) {
            return res.status(403).json({ message: "Only participants can delete this payment" });
        }

        await Payment.findByIdAndDelete(id);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting payment:", error);
        return res.status(500).json({ message: "Server error while deleting payment." });
    }
};

export default getPayments;
