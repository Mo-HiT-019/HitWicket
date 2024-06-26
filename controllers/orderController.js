const Product = require("../model/productModel");
const Address = require("../model/addressModel");
const User = require("../model/userModel");
const Order = require("../model/orderModel");
const Swal = require("sweetalert");
const mongoose = require("mongoose");
const fs = require("fs");
const puppeteer = require("puppeteer");
const ejs = require("ejs");
const document = require("pdfkit");
const Return = require("../model/returnSchema");

const renderUser_orders = async (req, res) => {
  let userId = req.session.user._id;
  const user_id = new mongoose.Types.ObjectId(userId);

  let orderDetails = await Order.aggregate([
    {
      $match: {
        customer_id: user_id,
      },
    },
    {
      $project: {
        _id: 1,
        items: 1,
        address: 1,
        payment_method: 1,
        status: 1,
        createdAt: 1,
      },
    },
  ]);
  orderDetails = orderDetails.reverse();
  const isHomePage = false;
  let arr = [];
  for (let i = 1; i < orderDetails.length / 4 + 1; i++) {
    arr.push(i);
  }
  let page = parseInt(req.query.page);
  let skip = (page - 1) * 4;
  if (req.query.page) {
    orderDetails = orderDetails.slice(skip, skip + 4);
  } else {
    orderDetails = orderDetails.slice(0, 4);
  }
  let last = arr[arr.length - 1];

  res.render("user/orderPage", { isHomePage, arr, last, orderDetails });
};

const renderOrders = async (req, res) => {
  let userId = req.session.user._id;
  const user_id = new mongoose.Types.ObjectId(userId);

  let orderDetails = await Order.aggregate([
    {
      $match: {
        customer_id: user_id,
      },
    },
    {
      $project: {
        _id: 1,
        items: 1,
        address: 1,
        payment_method: 1,
        status: 1,
        createdAt: 1,
      },
    },
  ]);
  orderDetails = orderDetails;
  const isHomePage = false;

  orderDetails = orderDetails.reverse();
  let arr = [];
  for (let i = 1; i < orderDetails.length / 4 + 1; i++) {
    arr.push(i);
  }
  let page = parseInt(req.query.page);
  let skip = (page - 1) * 4;
  if (req.query.page) {
    orderDetails = orderDetails.slice(skip, skip + 4);
  } else {
    orderDetails = orderDetails.slice(0, 4);
  }
  let last = arr[arr.length - 1];

  res.render("user/orderPage", { isHomePage, arr, last, orderDetails });
};

const renderOrder_details = async (req, res) => {
  try {
    const order_id = new mongoose.Types.ObjectId(req.params.id);

    let orderDetails = await Order.aggregate([
      {
        $match: {
          _id: order_id,
        },
      },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "products",
        },
      },
      {
        $unwind: "$products",
      },
    ]);

    const isHomePage = false;

    
    for (const order of orderDetails) {
      switch (order.items.status) {
        case "confirmed":
          order.items.track = 15;
          order.items.ordered = true;
          order.items.delivered = false;
          order.items.cancelled = false;
          order.items.shipped = false;
          order.items.outdelivery = false;
          order.items.return = false;
          order.items.inReturn = false;
          order.items.needHelp = true;
          break;
        case "Shipped":
          order.items.track = 38;
          order.items.ordered = true;
          order.items.delivered = false;
          order.items.cancelled = false;
          order.items.shipped = true;
          order.items.outdelivery = false;
          order.items.return = false;
          order.items.inReturn = false;
          order.items.needHelp = true;
          break;
        case "Out for Delivery":
          order.items.track = 65;
          order.items.ordered = true;
          order.items.delivered = false;
          order.items.cancelled = false;
          order.items.shipped = true;
          order.items.outdelivery = true;
          order.items.return = false;
          order.items.inReturn = false;
          order.items.needHelp = true;
          break;
        case "Delivered":
          order.items.track = 100;
          order.items.ordered = false;
          order.items.cancelled = false;
          order.items.shipped = true;
          order.items.delivered = true;
          order.items.outdelivery = true;
          order.items.return = true;
          order.items.inReturn = false;
          order.items.needHelp = false;
          break;
        case "cancelled":
          order.items.track = 0;
          order.items.ordered = false;
          order.items.cancelled = true;
          order.items.delivered = false;
          order.items.shipped = false;
          order.items.outdelivery = false;
          order.items.return = false;
          order.items.inReturn = false;
          order.items.needHelp = true;
          break;
        default:
          order.items.track = 0;
          order.items.pending = true;
          order.items.inReturn = false;
      }
    }
    const isInReturn = await Return.findOne({ order_id: order_id });

    if (isInReturn) {
      for (const order of orderDetails) {
        const orderProductId = (order.items.product_id || "").toString();
        const returnProductId = (isInReturn.product_id || "").toString();

        console.log("orderProductId:", orderProductId);
        console.log("returnProductId:", returnProductId);

        if (orderProductId === returnProductId) {
          order.items.inReturn = true;
          order.items.return = false;
          order.items.needHelp = false;
          order.items.status = isInReturn.status;
        }
      }
    }

    res.render("user/orderDetails", { orderDetails, isHomePage });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.redirect("/error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order_id = new mongoose.Types.ObjectId(req.params.order_id);
    const product_id = new mongoose.Types.ObjectId(req.params.product_id);

    const canceledOrder = await Order.findOneAndUpdate(
      { _id: order_id, "items.product_id": product_id },
      {
        $set: {
          "items.$.status": "cancelled",
          status: "cancelled",
        },
      },
      { new: true }
    );
    console.log("cance", canceledOrder);

    if (!canceledOrder) {
      return res.json({ success: false, message: "Order not found" });
    }

    for (const item of canceledOrder.items) {
      if (item.product_id.equals(product_id)) {
        const product = await Product.findById(item.product_id);

        product.stock += item.quantity;

        await product.save();

        const user_id = canceledOrder.customer_id;

        if (
          canceledOrder.payment_method === "Online Payment" ||
          canceledOrder.payment_method === "wallet"
        ) {
          console.log("payme", canceledOrder.payment_method);

          const walletAmount = item.price;

          console.log("dfs", walletAmount);
          const updatedUser = await User.findByIdAndUpdate(
            { _id: user_id },
            { $inc: { user_wallet: walletAmount } },
            { new: true }
          );

          const newHistoryItem = {
            amount: walletAmount,
            status: "Credit",
            time: Date.now(),
          };

          await User.findByIdAndUpdate(
            { _id: user_id },
            { $push: { wallet_history: newHistoryItem } }
          );

          req.session.user = updatedUser;
          await req.session.save();
        }
      }
    }

    await canceledOrder.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: canceledOrder,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const get_invoice = async (req, res) => {
  try {
    const product_id = new mongoose.Types.ObjectId(req.query.productId);
    const order_id = new mongoose.Types.ObjectId(req.query.orderId);
    let order = await Order.aggregate([
      {
        $match: {
          _id: order_id,
          "items.product_id": product_id,
        },
      },
      {
        $project: {
          _id: 1,
          customer_id: 1,
          items: 1,
          address: 1,
          payment_method: 1,
          status: 1,
          createdAt: 1,
        },
      },
      {
        $unwind: { path: "$items" },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: { path: "$product" },
      },
      {
        $lookup: {
          from: "users",
          localField: "customer_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: { path: "$user" },
      },
      {
        $project: {
          _id: 1,
          "user.name": 1,
          "user._id": 1,
          "user.email": 1,
          "user.number": 1,
          "product.name": 1,
          items: 1,
          address: 1,
          payment_method: 1,
          status: 1,
          createdAt: 1,
        },
      },
    ]);

    order.forEach((obj) => {
      if (obj?.createdAt) {
        obj.createdAt = formatDate(obj.createdAt);
      }
    });

    function formatDate(date) {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      return new Date(date).toLocaleDateString(undefined, options);
    }

    let productIdToFind = req.query.productId;
    const showOrder = order.find(
      (order) => order.items.product_id.toString() === productIdToFind
    );

    function formatDate(date) {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      return new Date(date).toLocaleDateString(undefined, options);
    }

    function generateRandomInvoiceId() {
      let id = showOrder.items.product_id.toString().slice(3, 10);
      const invoiceId = `INV-${id}`;
      return invoiceId;
    }

    const randomInvoiceId = generateRandomInvoiceId();
    showOrder.invoiceId = randomInvoiceId;

    const doc = new document();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice.pdf"`);

    doc.pipe(res);

    doc.fontSize(20).fillColor("purple").text(`INVOICE`, { align: "center" });
    doc.fontSize(12).fillColor("black").text(` `, { continued: true });
    doc.moveDown();

    doc.text(`HitWicket Invoice: ${showOrder.invoiceId}`);
    doc.text(`Sold by: HhtWicket`);
    doc.text(`hitwicket.com`);
    doc.text(`+91 9745767851`);
    doc.moveDown();

    doc.fontSize(20).fillColor("purple").text(`Billed To:`);
    doc.fontSize(12).fillColor("black").text(` `, { continued: true });
    doc.text(`${showOrder.user.name}`);
    doc.text(
      `${showOrder.address.house_name}(H),${showOrder.address.area_street}`
    );

    doc.text(`${showOrder.address.locality},${showOrder.address.town}`);
    doc.text(`${showOrder.address.state},${showOrder.address.pincode}`);
    doc.text(`${showOrder.user.email}`);
    doc.text(`${showOrder.user.number}`);
    doc.text(`Payment Method:${showOrder.payment_method}`);
    doc.moveDown();
    doc
      .fontSize(20)
      .fillColor("purple")
      .text(`Order Summary`, { align: "center" });

    doc.moveDown();
    const tableHeaders = ["No.", "Item", "Price", "Quantity"];

    const tableData = [
      {
        no: "01",
        item: showOrder.product.name,
        price: showOrder.items.price,
        quantity: showOrder.items.quantity,
      },
    ];

    const startX = 50;
    let startY = doc.y + 10;

    const colWidth = 140;

    doc.fontSize(12).fillColor("red");
    tableHeaders.forEach((header, index) => {
      doc.text(header, startX + index * colWidth, startY);
    });

    doc.fontSize(12).fillColor("black");
    startY += 20;
    tableData.forEach((row, rowIndex) => {
      Object.values(row).forEach((cell, colIndex) => {
        doc.text(
          cell.toString(),
          startX + colIndex * colWidth,
          startY + rowIndex * 20
        );
      });
    });
    doc.moveDown(2);
    const feeAndTotalX = 450;

    doc.text(`Shipping fee: 0`, feeAndTotalX, doc.y);
    doc.text(
      `Total: ${showOrder.items.price * showOrder.items.quantity}`,
      feeAndTotalX,
      doc.y
    );

    doc.end();
  } catch (error) {
    console.error(error);
    res.redirect("/error");
  }
};

const return_order = async (req, res) => {
  const orderId = req.query.order_id;
  const product_id = req.query.product_id;
  const user_id = req.session.user._id;
  const returnDetails = {
    order_id: orderId,
    product_id: product_id,
    user_id: user_id,
  };
  const isHomePage = false;
  res.render("user/return", {
    isHomePage,
    user: true,
    User: true,
    returnDetails,
  });
};

const order_return = async (req, res) => {
  let user_id = new mongoose.Types.ObjectId(req.session.user._id);

  let retrn = new Return({
    order_id: req.body.order_id,
    user_id: user_id,
    product_id: req.body.product_id,
    reason: req.body.reason,
    status: "pending",
    comment: req.body.comment,
  });
  try {
    await retrn.save();
    console.log("Return request saved:", retrn);
    req.flash("success_msg", "Return request submitted successfully");
    res.redirect(`/order/order-details/${req.body.order_id}`);
  } catch (err) {
    console.error("Error saving return request:", err);
    req.flash("error_msg", "Failed to submit return request");
    res.redirect(`/order/order-details/${req.body.order_id}`);
  }
};

module.exports = {
  renderUser_orders,
  renderOrders,
  renderOrder_details,
  cancelOrder,
  get_invoice,
  return_order,
  order_return,
};
