import express from "express";
import { addExpenses, addOrder, getExpenses, getOrders, getOrdersForUser, updateOrderStatus } from "../Controller/Orders.js";
import { downloadOrderInvoicePdf, generateOrderInvoice, getOrderInvoice } from "../Controller/Invoice.js";
import { requireAdmin, requireAuth, requireSelfOrAdmin } from "../Middleware/auth.js";

const router = express.Router();

router.post("/", requireAuth, addOrder);
router.get("/by-user/:userId", requireAuth, requireSelfOrAdmin("userId"), getOrdersForUser);
router.get("/", requireAuth, requireAdmin, getOrders);
router.patch("/:id", requireAuth, requireAdmin, updateOrderStatus);
router.post("/add-expense", requireAuth, requireAdmin, addExpenses);
router.get("/get-expenses", requireAuth, requireAdmin, getExpenses);

router.post("/:id/invoice", requireAuth, requireAdmin, generateOrderInvoice);
router.get("/:id/invoice", requireAuth, getOrderInvoice);
router.get("/:id/invoice/pdf", requireAuth, downloadOrderInvoicePdf);

export default router;
