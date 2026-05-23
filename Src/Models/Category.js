import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    /** Base64 data URL or https URL for category tile on homepage */
    imageUrl: {
      type: String,
    },
    isOccasional: {
      type: Boolean,
      default: false,
    },
    /** When true, products in this category should display prices as "Starting from ₹X" */
    isDynamicPriceCategory: {
      type: Boolean,
      default: false,
    },
    /** 1–5 = pinned slot on homepage; null = not featured */
    homepageOrder: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

const CategoryModel = mongoose.model("Category", categorySchema);

export default CategoryModel;
