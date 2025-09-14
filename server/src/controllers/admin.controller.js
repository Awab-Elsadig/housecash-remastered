import { User } from "../models/user.model.js";
import { House } from "../models/house.model.js";
import { Item } from "../models/item.model.js";
import PDFDocument from "pdfkit";

const isAdmin = (req) => {
	// Use req.originalUser if available, otherwise use req.user
	const adminUser = req.originalUser || req.user;
	return adminUser && adminUser.role === "admin";
};

export const getAllUsers = async (req, res) => {
	// Only allow admin (or impersonating admin) to list all users.
	if (!isAdmin(req)) {
		return res.status(403).json({ error: "Access denied" });
	}
	try {
		const users = await User.find().select("-password").exec();
		res.status(200).json({ users });
	} catch (error) {
		res.status(500).json({ error: error.message || "Error fetching users" });
	}
};

export const impersonateUser = async (req, res) => {
	// Only allow admin users to impersonate.
	if (!isAdmin(req)) {
		return res.status(403).json({ error: "Access denied" });
	}
	const { targetUserId } = req.body;
	try {
		const userToImpersonate = await User.findById(targetUserId);
		if (!userToImpersonate) {
			return res.status(404).json({ error: "User not found" });
		}

		console.log("=== STARTING IMPERSONATION ===");
		console.log("Admin user:", req.user.name, "ID:", req.user._id);
		console.log("Target user:", userToImpersonate.name, "ID:", userToImpersonate._id);
		console.log("Target user house code:", userToImpersonate.houseCode);

		// Store the original admin's ID if not already stored.
		if (!req.session.originalUserId) {
			req.session.originalUserId = req.user._id;
			console.log("Stored original admin in session:", req.session.originalUserId);
		}

		// Optionally, fetch house members for context.
		const houseCode = userToImpersonate.houseCode;
		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");

		// Set impersonation flag in the session.
		req.session.impersonatedUserId = targetUserId;
		console.log("Session after setting impersonatedUserId:", req.session);
		console.log("Session ID:", req.sessionID);

		// Save the session so that the impersonation flag and original admin are persisted.
		req.session.save((err) => {
			if (err) {
				console.error("Error saving session during impersonation:", err);
				return res.status(500).json({ error: "Error saving session" });
			}
			console.log("Session saved successfully. Session ID:", req.sessionID);
			console.log("=== IMPERSONATION STARTED ===");
			return res.status(200).json({
				message: `Now impersonating user ${userToImpersonate.username}`,
				user: userToImpersonate,
				houseMembers,
			});
		});
	} catch (error) {
		console.error("Impersonation error:", error);
		return res.status(500).json({ error: error.message || "Error impersonating user" });
	}
};

// Endpoint to stop impersonation.
export const stopImpersonation = async (req, res) => {
	console.log("Stop impersonation request received. Session ID:", req.sessionID);
	console.log("Session before stopping impersonation:", req.session);

	if (!req.session.impersonatedUserId) {
		console.error("No impersonation active in session.");
		return res.status(400).json({ error: "No impersonation active" });
	}

	try {
		// Optionally, fetch house members from the impersonated user's house.
		const impersonatedUser = await User.findById(req.session.impersonatedUserId);
		if (!impersonatedUser) {
			return res.status(404).json({ error: "Impersonated user not found" });
		}
		const houseCode = impersonatedUser.houseCode;
		const houseMembers = await House.findOne({ houseCode }).populate("members", "-password");

		// Clear the impersonation flag.
		req.session.impersonatedUserId = null;
		console.log("After clearing impersonatedUserId:", req.session);

		// Retrieve the original admin's user ID from the session.
		const originalUserId = req.session.originalUserId;
		console.log("Original admin ID in session:", originalUserId);

		// Remove the original admin from session for cleanliness.
		req.session.originalUserId = null;

		// Save the session so that changes are persisted.
		req.session.save(async (err) => {
			if (err) {
				console.error("Error saving session after stopping impersonation:", err);
				return res.status(500).json({ error: "Error saving session" });
			}
			console.log("Session saved after stopping impersonation. Session ID:", req.sessionID);
			console.log("Session after saving:", req.session);

			// Fetch the original admin from the database.
			let originalAdmin = null;
			if (originalUserId) {
				try {
					originalAdmin = await User.findById(originalUserId).select("-password");
					console.log("Original admin fetched:", originalAdmin);
				} catch (fetchError) {
					console.error("Error fetching original admin:", fetchError);
					return res.status(500).json({ error: "Error fetching original admin" });
				}
			}
			return res.status(200).json({
				message: "Impersonation stopped",
				originalAdmin,
				houseMembers,
			});
		});
	} catch (error) {
		console.error("Error during stop impersonation:", error);
		return res.status(500).json({ error: error.message || "Error stopping impersonation" });
	}
};

// Generate a PDF report of all past expenses (admin only)
export const generateExpensesReport = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        // Fetch all items with author and member info
        const items = await Item.find({})
            .populate("author", "name username email")
            .populate("members.userID", "name username email")
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        // Prepare PDF
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        res.status(200);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="expenses-report.pdf"');
        res.setHeader("Cache-Control", "no-store");
        doc.on("error", (err) => {
            console.error("PDF stream error:", err);
            try { res.end(); } catch (_) {}
        });
        doc.pipe(res);

        // Title
        doc.fontSize(18).text("HouseCash - Expenses Report", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#555").text(`Generated at: ${new Date().toLocaleString()}`, { align: "center" });
        doc.moveDown();
        doc.fillColor("#000");

        // Totals
        const grandTotal = items.reduce((sum, it) => sum + (it.price || 0), 0);
        doc.fontSize(12).text(`Total Items: ${items.length}`);
        doc.fontSize(12).text(`Grand Total: $${grandTotal.toFixed(2)}`);
        doc.moveDown();

        // Table-like headers
        const drawHr = () => { doc.moveTo(doc.x, doc.y).lineTo(555, doc.y).strokeColor('#ccc').lineWidth(0.5).stroke().moveDown(0.2); };
        doc.fontSize(11).text("Items", { underline: true });
        drawHr();

        // Items detail
        items.forEach((it, idx) => {
            const authorName = it.author?.name || it.author?.username || "Unknown";
            doc.fontSize(11).text(`${idx + 1}. ${it.name || "Untitled"}  -  $${(it.price || 0).toFixed(2)}`);
            doc.fontSize(9).fillColor('#444').text(`Author: ${authorName} • House: ${it.houseCode || "-"} • Created: ${new Date(it.createdAt).toLocaleString()}`);
            if (it.description) doc.text(`Description: ${it.description}`);

            // Members breakdown with paid/got
            if (Array.isArray(it.members) && it.members.length > 0) {
                doc.moveDown(0.2);
                doc.fontSize(9).fillColor('#000').text("Members:");
                it.members.forEach((m) => {
                    const name = m.userID?.name || m.userID?.username || String(m.userID || "");
                    const status = `paid=${m.paid ? '✔' : '✘'}`;
                    doc.fontSize(9).fillColor('#333').text(`- ${name} (${status})`);
                });
            }
            doc.fillColor('#000');
            doc.moveDown(0.5);
            drawHr();
        });

        doc.end();
    } catch (error) {
        console.error("Failed generating report:", error);
        return res.status(500).json({ error: error.message || "Failed to generate report" });
    }
};

// Generate CSV of all past expenses (admin only)
export const generateExpensesCSV = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        const items = await Item.find({})
            .populate("author", "name username email")
            .populate("members.userID", "name username email")
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.status(200);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="expenses-report.csv"');
        res.setHeader("Cache-Control", "no-store");
        res.write('\uFEFF'); // UTF-8 BOM to help Excel parse UTF-8 correctly

        const escapeCsv = (v) => {
            if (v === null || v === undefined) return "";
            const s = String(v);
            if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        };

        const header = [
            "Item ID",
            "Name",
            "Price",
            "Description",
            "HouseCode",
            "Author",
            "Created At",
            "Member Name",
            "Member Email",
            "Paid",
            "Got",
        ].join(",") + "\n";
        res.write(header);

        items.forEach((it) => {
            const base = [
                it._id,
                it.name || "",
                (it.price || 0).toFixed(2),
                it.description || "",
                it.houseCode || "",
                it.author?.name || it.author?.username || "",
                new Date(it.createdAt).toISOString(),
            ];
            if (Array.isArray(it.members) && it.members.length > 0) {
                it.members.forEach((m) => {
                    const row = [
                        ...base,
                        m.userID?.name || m.userID?.username || "",
                        m.userID?.email || "",
                        m.paid ? "true" : "false",
                    ].map(escapeCsv).join(",") + "\n";
                    res.write(row);
                });
            } else {
                const row = [...base, "", "", "", ""].map(escapeCsv).join(",") + "\n";
                res.write(row);
            }
        });

        res.end();
    } catch (error) {
        console.error("Failed generating CSV:", error);
        return res.status(500).json({ error: error.message || "Failed to generate CSV" });
    }
};

// Admin-triggered migration: remove members.got and normalize paid booleans
export const migrateItemsRemoveGot = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: "Access denied" });
    }
    try {
        const coll = Item.collection;
        const unsetResult = await coll.updateMany(
            { "members.got": { $exists: true } },
            { $unset: { "members.$[].got": "" } }
        );

        let coerced = 0;
        const cursor = coll.find({});
        // Iterate and coerce paid to boolean if needed
        // Using raw collection for performance
        // eslint-disable-next-line no-constant-condition
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            const members = Array.isArray(doc.members) ? doc.members : [];
            let changed = false;
            const normalized = members.map((m) => {
                if (typeof m?.paid !== "boolean") {
                    changed = true;
                    return { ...m, paid: !!m?.paid };
                }
                return m;
            });
            if (changed) {
                await coll.updateOne({ _id: doc._id }, { $set: { members: normalized } });
                coerced += 1;
            }
        }

        return res.status(200).json({
            message: "Migration complete",
            unsetModified: unsetResult?.modifiedCount || 0,
            normalizedDocs: coerced,
        });
    } catch (error) {
        console.error("Migration error:", error);
        return res.status(500).json({ error: error.message || "Migration failed" });
    }
};
