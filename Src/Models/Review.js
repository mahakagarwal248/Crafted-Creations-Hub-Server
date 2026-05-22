import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    /** Snapshot of the reviewer's display name at the time of submission. */
    userName: {
      type: String,
      trim: true,
      default: "",
    },
    /** Base64 data URL or remote URL. Falls back to DEFAULT_REVIEW_AVATAR. */
    userAvatar: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
    /** Optional photo (base64 data URL or remote URL). */
    photoUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ReviewSchema.index({ userId: 1, orderId: 1, productId: 1 }, { unique: true });

const ReviewModel = mongoose.model("Review", ReviewSchema);
export default ReviewModel;
