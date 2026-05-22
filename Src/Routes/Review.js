import express from "express";
import {
  addReview,
  getLatestReviews,
  getReviewsByProduct,
  getReviewsByUser,
} from "../Controller/Review.js";
import { requireAuth, requireSelfOrAdmin } from "../Middleware/auth.js";

const router = express.Router();

router.get("/latest", getLatestReviews);
router.get("/product/:productId", getReviewsByProduct);
router.get("/by-user/:userId", requireAuth, requireSelfOrAdmin("userId"), getReviewsByUser);
router.post("/", requireAuth, addReview);

export default router;
