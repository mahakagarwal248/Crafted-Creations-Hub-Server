import CartModel from '../Models/Cart.js';

function getRequestUserId(req) {
  return req.headers['x-user-id'] || req.body?.userId || null;
}

function ensureCartAccess(cart, requestUserId, res) {
  if (cart?.userId) {
    if (!requestUserId || cart.userId.toString() !== requestUserId) {
      res.status(403).json({ success: false, message: 'Cart does not belong to this user' });
      return false;
    }
  }
  return true;
}

export const getCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const requestUserId = getRequestUserId(req);
    if (!cartId) return res.status(400).json({ success: false, message: 'cartId required' });
    const cart = await CartModel.findOne({ cartId }).lean();
    if (!cart) return res.status(200).json({ cartId, items: [] });
    if (!ensureCartAccess(cart, requestUserId, res)) return;
    return res.status(200).json(cart);
  } catch (error) {
    console.error('getCart:', error);
    return res.status(500).json(error);
  }
};

export const addToCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const { productId, name, price, quantity = 1, userId: bodyUserId } = req.body;
    const requestUserId = getRequestUserId(req) || bodyUserId;
    if (!cartId || productId == null || !name || price == null) {
      return res.status(400).json({ success: false, message: 'cartId, productId, name, price required' });
    }
    const qty = Math.max(1, Number(quantity));
    let cart = await CartModel.findOne({ cartId });
    if (!cart) {
      cart = await CartModel.create({
        cartId,
        userId: requestUserId || undefined,
        items: [{ productId: Number(productId), name, price: Number(price), quantity: qty }],
      });
    } else {
      if (!ensureCartAccess(cart, requestUserId, res)) return;
      if (requestUserId && !cart.userId) cart.userId = requestUserId;
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
    const requestUserId = getRequestUserId(req);
    if (!cartId || productId == null) return res.status(400).json({ success: false, message: 'cartId and productId required' });
    const cart = await CartModel.findOne({ cartId });
    if (!cart) return res.status(200).json({ cartId, items: [] });
    if (!ensureCartAccess(cart, requestUserId, res)) return;
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
    const requestUserId = getRequestUserId(req);
    if (!cartId || productId == null) return res.status(400).json({ success: false, message: 'cartId and productId required' });
    const cart = await CartModel.findOne({ cartId });
    if (cart && !ensureCartAccess(cart, requestUserId, res)) return;
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
    const requestUserId = getRequestUserId(req);
    if (!cartId) return res.status(400).json({ success: false, message: 'cartId required' });
    const cart = await CartModel.findOne({ cartId });
    if (cart && !ensureCartAccess(cart, requestUserId, res)) return;
    await CartModel.findOneAndUpdate({ cartId }, { items: [] }, { new: true, upsert: true });
    return res.status(200).json({ cartId, items: [] });
  } catch (error) {
    console.error('clearCart:', error);
    return res.status(500).json(error);
  }
};
