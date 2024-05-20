const express = require('express');
const router = express.Router();
const {logged} = require('../middleware/userauth');

const orderController = require('../controllers/orderController');
const Order=require('../model/orderModel')
const setCommonHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    // You can add more headers if needed
    // res.setHeader('Another-Header', 'header-value');
    next();
  };
  const { isLoggedIn,block } = require('../middleware/userauth');
  // Use the middleware for all routes
  router.use(setCommonHeaders);


  router.get('/',isLoggedIn,block,setCommonHeaders,orderController.renderOrders);

  router.get('/order/:id',isLoggedIn,block,setCommonHeaders,orderController.renderUser_orders);

  router.get('/order-details/:id',isLoggedIn,block,orderController.renderOrder_details);

  router.get('/cancel_order/:product_id/:order_id',isLoggedIn, orderController.cancelOrder);

  router.get('/get-invoice',block,orderController.get_invoice);

  router.get('/return-order', isLoggedIn,block,setCommonHeaders, orderController.return_order);

  router.post('/order-return', isLoggedIn,setCommonHeaders, orderController.order_return);




module.exports=router;