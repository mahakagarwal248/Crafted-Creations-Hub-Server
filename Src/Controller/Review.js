import mongoose from "mongoose";

import ReviewModel from "../Models/Review.js";
import OrderModel from "../Models/Orders.js";
import userModel from "../Models/Users.js";
import { DEFAULT_REVIEW_AVATAR } from "../Utils/defaultAvatar.js";

const sanitizeRating = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < 1 || r > 5) return null;
  return r;
};

export const addReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment, photoUrl } = req.body;
    const userId = req.user?.id;

    if (
      !productId ||
      !userId ||
      !orderId ||
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(orderId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid product, user, or order id." });
    }

    const safeRating = sanitizeRating(rating);
    if (safeRating == null) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const order = await OrderModel.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const ownerId = String(order.userId || order.customerId || "");
    if (ownerId !== String(userId)) {
      return res.status(403).json({ success: false, message: "You can only review your own orders." });
    }

    const itemInOrder = (order.items || []).some(
      (item) => String(item.productId) === String(productId)
    );
    if (!itemInOrder) {
      return res.status(400).json({ success: false, message: "This product is not part of the order." });
    }

    const existing = await ReviewModel.findOne({ productId, userId, orderId }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: "You have already reviewed this item.", data: existing });
    }

    const customer = await userModel.findById(userId).lean();

    const review = await ReviewModel.create({
      productId,
      userId,
      orderId,
      rating: safeRating,
      comment: typeof comment === "string" ? comment.trim().slice(0, 1500) : "",
      photoUrl: typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : "",
      userName: customer?.name || "",
      userAvatar: DEFAULT_REVIEW_AVATAR,
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed this item." });
    }
    console.error("addReview:", error);
    return res.status(500).json({ success: false, message: "Failed to add review." });
  }
};

export const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product id." });
    }

    const reviews = await ReviewModel.find({ productId })
      .sort({ createdAt: -1 })
      .lean();

    const withAvatars = reviews.map((r) => ({
      ...r,
      userAvatar: r.userAvatar || DEFAULT_REVIEW_AVATAR,
    }));

    const totalCount = withAvatars.length;
    const averageRating = totalCount
      ? Number((withAvatars.reduce((sum, r) => sum + (r.rating || 0), 0) / totalCount).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      data: { reviews: withAvatars, totalCount, averageRating },
    });
  } catch (error) {
    console.error("getReviewsByProduct:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews." });
  }
};

export const getLatestReviews = async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const minRating = Math.min(5, Math.max(1, parseInt(req.query.minRating, 10) || 4));

    const reviews = await ReviewModel.find({ rating: { $gte: minRating } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: "productId", select: "productId name photos imageUrl" })
      .lean();

    const data = reviews.map((r) => ({
      ...r,
      userAvatar: r.userAvatar || DEFAULT_REVIEW_AVATAR,
      product: r.productId && typeof r.productId === "object" ? r.productId : null,
      productId: r.productId && typeof r.productId === "object" ? r.productId._id : r.productId,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getLatestReviews:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews." });
  }
};

export const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const reviews = await ReviewModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error("getReviewsByUser:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews." });
  }
};
