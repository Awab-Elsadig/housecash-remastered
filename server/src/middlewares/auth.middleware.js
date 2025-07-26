import { User } from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
	try {
		// Now, check if the current session has an impersonated user ID.
		// In your auth.middleware:
		if (req.session && req.session.impersonatedUserId) {
			req.originalUser = req.user; // keep the admin data
			const impersonatedUser = await User.findById(req.session.impersonatedUserId);
			if (impersonatedUser) {
				req.user = impersonatedUser;
			}
		}

		next();
	} catch (error) {
		next(error);
	}
};
