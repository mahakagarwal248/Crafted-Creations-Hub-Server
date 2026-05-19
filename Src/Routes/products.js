import express from "express";
import {
  addProduct,
  getProducts,
  getProductById,
  listProducts,
  updateProduct,
  updateProductActive,
} from "../Controller/Products.js";
const router = express.Router();

router.post("/", addProduct);
router.get("/list", listProducts);
router.get("/", getProducts);
router.patch("/:productId/active", updateProductActive);
router.put("/:productId", updateProduct);
router.get("/:productId", getProductById);

export default router;
