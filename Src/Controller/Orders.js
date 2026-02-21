import moment from 'moment';

import OrderModel from "../Models/Orders.js";
import TransactionModel from "../Models/Transactions.js";
import ProductModel from '../Models/Products.js';
import mongoose from 'mongoose';
import userModel from '../Models/Users.js';

export const addOrder = async (req, res) => {
    try {
    const { productDetails, customerId, discount = 0, amountPaid = 0 } = req.body;

    console.log(req.body)
    // Basic validation
    if (!productDetails) {
      return res.status(400).json({ success: false, message: "Invalid product id or quantity" });
    }

    let customerData = await userModel.findOne({_id: customerId})

    if(!customerData) throw { Status: "Error", Message: "Invalid customer id!"}
    let allItems = [];
    let totalAmount = 0
    for(let product of productDetails){
        let productData = await ProductModel.findOne({productId: product.productId});
        console.log(productData)
        if(productData){
            totalAmount = (totalAmount + productData.price) * Number(product.quantity)
            allItems.push({
                productId: productData.id,
                name: productData.name,
                price: productData.price,
                quantity:Number(product.quantity),
                discount: Number(discount),
                amountPayable: Number((productData?.price *Number(product.quantity)) - ((productData?.price *Number(product.quantity) * Number(discount)) / 100))
            })
        }
    }
    let amountPayable = totalAmount - (totalAmount * (Number(discount) / 100)) || 0;
    const obj = {
        customerId, 
        items: allItems,
        totalAmount: totalAmount,
        discount,
        amountPayable,
        amountPaid: Number(amountPaid),
        pendingAmount: Number(amountPayable) - Number(amountPaid),
        shippingAddress: customerData.shippingAddress,
        placedAt: new Date()
    }

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