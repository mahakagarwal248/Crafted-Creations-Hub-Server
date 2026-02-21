import express from "express";
import { addExpenses, addOrder, getExpenses, getOrders, updateOrderStatus } from "../Controller/Orders.js";
const router = express.Router();

router.post("/", addOrder);
router.get("/", getOrders);
router.patch("/:id", updateOrderStatus);
router.post("/add-expense", addExpenses);
router.get("/get-expenses", getExpenses);

export default router;
