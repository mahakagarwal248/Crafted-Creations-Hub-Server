import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const AutoIncrement = AutoIncrementFactory(mongoose);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String, // legacy single image link or path
    },
    /** Base64 data URLs (e.g. data:image/jpeg;base64,...) or https URLs */
    photos: {
      type: [String],
      default: [],
    },
    minDaysToDispatch: {
        type: Number
    }
  },
  { timestamps: true } // auto adds createdAt & updatedAt
);

productSchema.plugin(AutoIncrement, { inc_field: "productId" });

const ProductModel = mongoose.model("Products", productSchema);

export default ProductModel;
