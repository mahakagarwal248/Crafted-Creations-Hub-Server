import express from "express";
import {
  addProduct,
  getProducts,
  getProductById,
  listProducts,
  updateProduct,
  updateProductActive,
} from "../Controller/Products.js";
import { requireAdmin, requireAuth } from "../Middleware/auth.js";

const router = express.Router();

router.get("/list", requireAuth, requireAdmin, listProducts);
router.get("/", getProducts);
router.get("/:productId", getProductById);

router.post("/", requireAuth, requireAdmin, addProduct);
router.patch("/:productId/active", requireAuth, requireAdmin, updateProductActive);
router.put("/:productId", requireAuth, requireAdmin, updateProduct);

export default router;
