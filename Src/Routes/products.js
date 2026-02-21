import express from "express";
import { addProduct, getProducts } from "../Controller/Products.js";
const router = express.Router();

// Example Home Route
router.post("/", addProduct);
router.get("/", getProducts);

export default router;
