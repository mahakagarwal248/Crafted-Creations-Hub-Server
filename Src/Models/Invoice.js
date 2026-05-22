import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    pdfPath: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const InvoiceModel = mongoose.model("Invoice", InvoiceSchema);
export default InvoiceModel;
