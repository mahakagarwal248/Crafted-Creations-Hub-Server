import CartModel from '../Models/Cart.js';

export const getCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    if (!cartId) return res.status(400).json({ success: false, message: 'cartId required' });
    const cart = await CartModel.findOne({ cartId }).lean();
    return res.status(200).json(cart || { cartId, items: [] });
  } catch (error) {
    console.error('getCart:', error);
    return res.status(500).json(error);
  }
};

export const addToCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { productId, name, price, quantity = 1 } = req.body;
    if (!cartId || productId == null || !name || price == null) {
      return res.status(400).json({ success: false, message: 'cartId, productId, name, price required' });
    }
    const qty = Math.max(1, Number(quantity));
    let cart = await CartModel.findOne({ cartId });
    if (!cart) {
      cart = await CartModel.create({
        cartId,
        items: [{ productId: Number(productId), name, price: Number(price), quantity: qty }],
      });
    } else {
      const existing = cart.items.find((i) => i.productId === Number(productId));
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.items.push({ productId: Number(productId), name, price: Number(price), quantity: qty });
      }
      await cart.save();
    }
    const updated = await CartModel.findOne({ cartId }).lean();
    return res.status(200).json(updated);
  } catch (error) {
    console.error('addToCart:', error);
    return res.status(500).json(error);
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { cartId, productId } = req.params;
    const { quantity } = req.body;
    if (!cartId || productId == null) return res.status(400).json({ success: false, message: 'cartId and productId required' });
    const cart = await CartModel.findOne({ cartId });
    if (!cart) return res.status(200).json({ cartId, items: [] });
    const num = Number(quantity);
    if (num <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== Number(productId));
    } else {
      const item = cart.items.find((i) => i.productId === Number(productId));
      if (item) item.quantity = num;
    }
    await cart.save();
    const updated = await CartModel.findOne({ cartId }).lean();
    return res.status(200).json(updated);
  } catch (error) {
    console.error('updateCartItem:', error);
    return res.status(500).json(error);
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { cartId, productId } = req.params;
    if (!cartId || productId == null) return res.status(400).json({ success: false, message: 'cartId and productId required' });
    const cart = await CartModel.findOne({ cartId });
    if (cart) {
      cart.items = cart.items.filter((i) => i.productId !== Number(productId));
      await cart.save();
    }
    const updated = await CartModel.findOne({ cartId }).lean();
    return res.status(200).json(updated || { cartId, items: [] });
  } catch (error) {
    console.error('removeFromCart:', error);
    return res.status(500).json(error);
  }
};

export const clearCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    if (!cartId) return res.status(400).json({ success: false, message: 'cartId required' });
    await CartModel.findOneAndUpdate({ cartId }, { items: [] }, { new: true, upsert: true });
    return res.status(200).json({ cartId, items: [] });
  } catch (error) {
    console.error('clearCart:', error);
    return res.status(500).json(error);
  }
};
