import fs from "fs";
import mongoose from "mongoose";

import InvoiceModel from "../Models/Invoice.js";
import OrderModel from "../Models/Orders.js";
import userModel from "../Models/Users.js";
import { buildInvoiceSnapshot } from "../Utils/buildInvoiceSnapshot.js";
import { getNextInvoiceNumber } from "../Utils/invoiceCounter.js";
import { generateInvoicePdf, getInvoicePdfAbsolutePath } from "../Utils/generateInvoicePdf.js";

export const generateOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id." });
    }

    const existing = await InvoiceModel.findOne({ orderId: id }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Invoice already exists for this order.",
        data: existing,
      });
    }

    const order = await OrderModel.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const customerId = order.customerId || order.userId;
    const customer = customerId ? await userModel.findById(customerId).lean() : null;

    const invoiceNumber = await getNextInvoiceNumber();
    const generatedAt = new Date();
    const snapshot = buildInvoiceSnapshot(order, customer, { invoiceNumber, generatedAt });

    const pdfPath = await generateInvoicePdf(snapshot);
    const relativePdfPath = `uploads/invoices/${invoiceNumber}.pdf`;

    const invoice = await InvoiceModel.create({
      orderId: order._id,
      invoiceNumber,
      generatedAt,
      snapshot,
      pdfPath: relativePdfPath,
    });

    return res.status(201).json({
      success: true,
      message: "Invoice generated successfully.",
      data: invoice,
      pdfAbsolutePath: pdfPath,
    });
  } catch (error) {
    console.error("generateOrderInvoice:", error);
    return res.status(500).json({ success: false, message: "Failed to generate invoice." });
  }
};

async function ensureOrderAccess(req, orderId) {
  if (req.user?.role === "admin") return { ok: true };
  const order = await OrderModel.findById(orderId).lean();
  if (!order) return { ok: false, status: 404, message: "Order not found." };
  const ownerId = String(order.userId || order.customerId || "");
  if (ownerId !== String(req.user?.id || "")) {
    return { ok: false, status: 403, message: "You do not have access to this invoice." };
  }
  return { ok: true };
}

export const getOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id." });
    }

    const access = await ensureOrderAccess(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const invoice = await InvoiceModel.findOne({ orderId: id }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found for this order." });
    }

    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    console.error("getOrderInvoice:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoice." });
  }
};

export const downloadOrderInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id." });
    }

    const access = await ensureOrderAccess(req, id);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const invoice = await InvoiceModel.findOne({ orderId: id }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    const filePath = getInvoicePdfAbsolutePath(invoice.invoiceNumber);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "PDF file not found on server." });
    }

    const downloadFlag = req.query?.download;
    const isDownload =
      String(downloadFlag || "").toLowerCase() === "1" ||
      String(downloadFlag || "").toLowerCase() === "true";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename="${invoice.invoiceNumber}.pdf"`
    );
    return res.sendFile(filePath);
  } catch (error) {
    console.error("downloadOrderInvoicePdf:", error);
    return res.status(500).json({ success: false, message: "Failed to download invoice PDF." });
  }
};
