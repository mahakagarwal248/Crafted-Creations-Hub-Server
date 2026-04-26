import moment from 'moment';
import mongoose from "mongoose";

import OrderModel from "../Models/Orders.js";
import TransactionModel from "../Models/Transactions.js";
import ProductModel from '../Models/Products.js';
import userModel from '../Models/Users.js';

export const addOrder = async (req, res) => {
    try {
    const { productDetails, customerId, discount = 0, amountPaid = 0 } = req.body;

    if (!productDetails || !Array.isArray(productDetails) || productDetails.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid product id or quantity" });
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

export const getExpenses = async (req, res) => {
  try {
    let query = { type: "expense" }
    let allExpenses = await TransactionModel.find(query);
    
    if(!allExpenses) throw { Status: "Error", Message: "Error in fetching expenses"}

    return res.status(200).json(allExpenses)
  } catch (error) {
    console.error("Error adding transaction:", error);
    return res.status(500).json(error);
  }
}

export const getOrders = async (req, res) => {
  try {
    // let query = { type: "expense" }
    let allOrders = await OrderModel.find().lean();
    
    if(!allOrders) throw { Status: "Error", Message: "Error in fetching expenses"}

    return res.status(200).json(allOrders)
  } catch (error) {
    console.error("Error adding transaction:", error);
    return res.status(500).json(error);
  }
}

/** Orders placed by a specific user (checkout / storefront). */
export const getOrdersForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }
    const oid = new mongoose.Types.ObjectId(userId);
    const orders = await OrderModel.find({
      $or: [{ userId: oid }, { customerId: oid }],
    })
      .sort({ placedAt: -1 })
      .lean();

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