import express from "express";
import productRoutes from './products.js';
import categoryRoutes from './categories.js';
import orderRoutes from './Orders.js';
import userRoutes from './users.js';
import cartRoutes from './Cart.js';
import checkoutRoutes from './Checkout.js';
import pincodeRoutes from './pincode.js';
import reviewRoutes from './Review.js';
import { attachUser } from '../Middleware/auth.js';

const router = express.Router();

router.use(attachUser);

router.get("/", (req, res) => {
  res.send("Welcome to the Node.js API!");
});

router.use('/product', productRoutes);
router.use('/category', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/carts', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/pincode', pincodeRoutes);
router.use('/reviews', reviewRoutes);

export default router;
