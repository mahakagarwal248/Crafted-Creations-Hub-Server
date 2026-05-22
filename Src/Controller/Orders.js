import moment from 'moment';
import mongoose from "mongoose";

import OrderModel from "../Models/Orders.js";
import TransactionModel from "../Models/Transactions.js";
import ProductModel from '../Models/Products.js';
import userModel from '../Models/Users.js';

export const addOrder = async (req, res) => {
    try {
    const { productDetails, discount = 0, amountPaid = 0 } = req.body;
    let { customerId } = req.body;

    if (!productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid product id or quantity" });
    }

    // Authenticated users can only place orders for themselves; admins may place on behalf of another customer.
    if (req.user) {
      if (req.user.role !== "admin") {
        customerId = req.user.id;
      } else if (!customerId) {
        customerId = req.user.id;
      }
    }
    if (!customerId) {
      return res.status(400).json({ success: false, message: "User is required to place an order." });
    }

    const customerData = await userModel.findById(customerId).lean();
    if (!customerData) {
      return res.status(400).json({ success: false, message: "Invalid customer id." });
    }

    const disc = Number(discount) || 0;
    const allItems = [];
    let totalAmount = 0;

    for (const product of productDetails) {
      const pid = Number(product.productId);
      const qty = Math.max(1, Number(product.quantity) || 1);
      const productData = await ProductModel.findOne({ productId: pid });
      if (!productData) continue;
      const lineSubtotal = productData.price * qty;
      totalAmount += lineSubtotal;
      const lineAfterDiscount = lineSubtotal - (lineSubtotal * disc) / 100;
      allItems.push({
        productId: productData._id,
        name: productData.name,
        price: productData.price,
        quantity: qty,
        discount: disc,
        amountPayable: Number(lineAfterDiscount.toFixed(2)),
      });
    }

    if (allItems.length === 0) {
      return res.status(400).json({ success: false, message: "No valid products in order." });
    }

    const amountPayable = Number((totalAmount - (totalAmount * disc) / 100).toFixed(2));
    const paid = Number(amountPaid) || 0;

    const obj = {
        userId: customerData._id,
        customerId: customerData._id,
        items: allItems,
        totalAmount,
        discount: disc,
        amountPayable,
        amountPaid: paid,
        pendingAmount: Number((amountPayable - paid).toFixed(2)),
        shippingAddress: customerData.shippingAddress,
        placedAt: new Date()
    };

    console.log(obj)
    let newOrder = await OrderModel.create(obj)

    if(!newOrder) throw { Status: "Error", Message: "Error in creating Order"}

     // Create transaction
    let newTransaction = await TransactionModel.create({
      type: "income",
      amount: Number(amountPaid),
      date: moment().format(),
      orderIdRef: newOrder._id,
      paymentMethod: "upi"
    });

    if(!newTransaction) throw { Status: "Error", Message: "Error in saving transaction"}

    return res.status(200).json({
      success: true,
      message: "Order added successfully",
      data: newOrder,
    });
  } catch (error) {
        console.error("Error adding transaction:", error);
        return res.status(500).json(error);
  }
}

export const addExpenses = async (req, res) => {
    try {
        let { amount, paidAt, description } = req.body;
        let newTransaction = await TransactionModel.create({
            type: "expense",
            amount,
            description,
            paidAt,
            date: moment().format(),
        });

        if(!newTransaction) throw { Status: "Error", Message: "Error in saving transaction"}

        return res.status(200).json(newTransaction)
    } catch (error) {
        console.error("Error adding transaction:", error);
        return res.status(500).json(error);
    }
}

function parsePagination(req, defaultLimit = 10) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const getExpenses = async (req, res) => {
  try {
    const query = { type: "expense" };
    const { page, limit, skip } = parsePagination(req);
    const totalCount = await TransactionModel.countDocuments(query);
    const items = await TransactionModel.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      items,
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return res.status(500).json(error);
  }
};

export const getOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const totalCount = await OrderModel.countDocuments();
    const items = await OrderModel.aggregate([
      { $sort: { placedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "invoices",
          localField: "_id",
          foreignField: "orderId",
          as: "_invoice",
        },
      },
      {
        $addFields: {
          invoiceNumber: { $arrayElemAt: ["$_invoice.invoiceNumber", 0] },
          hasInvoice: { $gt: [{ $size: "$_invoice" }, 0] },
        },
      },
      { $project: { _invoice: 0 } },
    ]);

    return res.status(200).json({
      items,
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json(error);
  }
};

/** Orders placed by a specific user (checkout / storefront). */
export const getOrdersForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }
    const oid = new mongoose.Types.ObjectId(userId);
    const orders = await OrderModel.aggregate([
      { $match: { $or: [{ userId: oid }, { customerId: oid }] } },
      { $sort: { placedAt: -1 } },
      {
        $lookup: {
          from: "invoices",
          localField: "_id",
          foreignField: "orderId",
          as: "_invoice",
        },
      },
      {
        $addFields: {
          invoiceNumber: { $arrayElemAt: ["$_invoice.invoiceNumber", 0] },
          hasInvoice: { $gt: [{ $size: "$_invoice" }, 0] },
        },
      },
      { $project: { _invoice: 0 } },
    ]);

    return res.status(200).json(orders);
  } catch (error) {
    console.error("getOrdersForUser:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders." });
  }
};

const allowedStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!id || !status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order id or status" });
    }
    const updateFields = { status };
    if (status === "DELIVERED") {
      const order = await OrderModel.findById(id).lean();
      if (order) {
        updateFields.pendingAmount = 0;
        updateFields.amountPaid = order.totalAmount;
      }
    }
    const updated = await OrderModel.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    ).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json(error);
  }
};