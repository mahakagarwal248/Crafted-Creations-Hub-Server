import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const AutoIncrement = AutoIncrementFactory(mongoose);

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number,
      unique: true,
    },
    /** Logged-in shopper (same as legacy customerId) */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true }, // per unit
        discount: { type: Number, required: true },
        amountPayable: { type: Number, required: true }, // quantity * price
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
    },
    pendingAmount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
    shippingAddress: {
      address: String,
      city: String,
      state: String,
      zip: String,
    },
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    payment: {
      method: { type: String, enum: ["CASH", "CARD", "UPI", "PAYPAL"] },
      status: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
      transactionId: { type: String },
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

OrderSchema.plugin(AutoIncrement, { inc_field: "orderId" });

const OrderModel = mongoose.model("Order", OrderSchema);
export default OrderModel;