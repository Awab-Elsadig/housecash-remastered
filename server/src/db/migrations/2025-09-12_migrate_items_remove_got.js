import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// One-off migration script: remove `members.$.got` from all items and keep `paid`
// Usage: node server/src/db/migrations/2025-09-12_migrate_items_remove_got.js

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
  if (!uri) {
    console.error("Missing MONGO_URI env var");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const items = db.collection("items");

  // 1) Unset the got field from all member entries
  const unsetResult = await items.updateMany(
    { "members.got": { $exists: true } },
    { $unset: { "members.$[].got": "" } }
  );
  console.log("Unset got from members:", unsetResult.modifiedCount);

  // 2) Ensure paid is boolean (coerce truthy/falsy if needed)
  const cursor = items.find({});
  let coerced = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    let changed = false;
    const members = Array.isArray(doc.members) ? doc.members : [];
    const normalized = members.map((m) => {
      if (typeof m.paid !== "boolean") {
        changed = true;
        return { ...m, paid: !!m.paid };
      }
      return m;
    });
    if (changed) {
      await items.updateOne({ _id: doc._id }, { $set: { members: normalized } });
      coerced += 1;
    }
  }
  console.log("Normalized paid in docs:", coerced);

  await mongoose.disconnect();
  console.log("Migration complete.");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


