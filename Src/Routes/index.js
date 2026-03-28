import express from "express";
import productRoutes from './products.js';
import orderRoutes from './Orders.js';
import userRoutes from './users.js';
import cartRoutes from './Cart.js';
import checkoutRoutes from './Checkout.js';

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Node.js API!");
});

router.use('/product', productRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/carts', cartRoutes);
router.use('/checkout', checkoutRoutes);

export default router;
