import mongoose from "mongoose";

const COUNTERS = "counters";
const SEQUENCE_ID = "invoiceNumber";

export function formatInvoiceNumber(seq) {
  return `INV-${String(seq).padStart(4, "0")}`;
}

export function parseInvoiceSeq(invoiceNumber) {
  if (!invoiceNumber || typeof invoiceNumber !== "string") return 0;
  const match = invoiceNumber.match(/^INV-(\d+)$/i);
  return match ? parseInt(match[1], 10) : 0;
}

/** Align counter with highest existing INV-#### in invoices collection. */
export async function syncInvoiceCounterFromInvoices() {
  const db = mongoose.connection.db;
  if (!db) return;

  const top = await db
    .collection("invoices")
    .findOne(
      { invoiceNumber: { $type: "string" } },
      { sort: { invoiceNumber: -1 }, projection: { invoiceNumber: 1 } }
    );

  const maxId = parseInvoiceSeq(top?.invoiceNumber);

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

export async function getNextInvoiceNumber() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");

  const result = await db.collection(COUNTERS).findOneAndUpdate(
    { id: SEQUENCE_ID, reference_value: null },
    { $inc: { seq: 1 }, $setOnInsert: { id: SEQUENCE_ID, reference_value: null } },
    { upsert: true, returnDocument: "after" }
  );

  const seq = result?.seq ?? 1;
  return formatInvoiceNumber(seq);
}
