import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../Controller/Cart.js';

const router = express.Router();

router.get('/:cartId', getCart);
router.post('/:cartId/items', addToCart);
router.patch('/:cartId/items/:productId', updateCartItem);
router.delete('/:cartId/items/:productId', removeFromCart);
router.delete('/:cartId', clearCart);

export default router;
