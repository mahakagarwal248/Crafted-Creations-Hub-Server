import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["income", "expense"], // earned or spent
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "bank", "upi", "other"],
    default: "cash",
  },
  date: {
    type: Date,
    default: Date.now, // when transaction happened
  },
  paidAt: {
    type: String
  },
  orderIdRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  }
},{
    timestamps: true
});

const TransactionModel = mongoose.model("Transaction", transactionSchema);

export default TransactionModel;
