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
      type: String, // store image link or path
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
