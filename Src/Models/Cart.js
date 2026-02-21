import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const cartSchema = new mongoose.Schema(
  {
    cartId: { type: String, required: true, unique: true },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

const CartModel = mongoose.model('Cart', cartSchema);
export default CartModel;
