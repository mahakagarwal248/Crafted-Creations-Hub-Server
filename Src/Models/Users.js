import mongoose from "mongoose";

const userScehma = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: Number,
      required: true,
      min: 0,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress: {
      address: String,
      city: String,
      state: String,
      zip: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true } // auto adds createdAt & updatedAt
);

const userModel = mongoose.model("User", userScehma);

export default userModel;
