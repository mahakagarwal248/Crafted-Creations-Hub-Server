import express from "express";
import { addProduct, getProducts, getProductById } from "../Controller/Products.js";
const router = express.Router();

router.post("/", addProduct);
router.get("/", getProducts);
router.get("/:productId", getProductById);

export default router;
