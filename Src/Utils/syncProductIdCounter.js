import mongoose from "mongoose";

/** mongoose-sequence default collection and id when `plugin(AutoIncrement, { inc_field: "productId" })` */
const COUNTERS = "counters";
const SEQUENCE_ID = "productId";

/**
 * Aligns the mongoose-sequence counter with the highest productId in `products`,
 * so the next insert gets max(productId) + 1. Fixes E11000 when counters were reset/out of sync.
 */
export async function syncProductIdCounterFromProducts() {
  const db = mongoose.connection.db;
  if (!db) return;

  const top = await db
    .collection("products")
    .findOne({ productId: { $type: "number" } }, { sort: { productId: -1 }, projection: { productId: 1 } });

  const maxId = typeof top?.productId === "number" ? top.productId : 0;

  const bumped = await db.collection(COUNTERS).updateMany({ id: SEQUENCE_ID }, { $max: { seq: maxId } });

  if (bumped.matchedCount === 0) {
    await db.collection(COUNTERS).updateOne(
      { id: SEQUENCE_ID, reference_value: null },
      {
        $max: { seq: maxId },
        $setOnInsert: { id: SEQUENCE_ID, reference_value: null },
      },
      { upsert: true }
    );
  }
}
