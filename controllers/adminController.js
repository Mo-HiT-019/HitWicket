const bcrypt = require('bcrypt');
const User = require('../model/userModel');
const Product = require('../model/productModel');
const flash=require('express-flash')
const mongoose = require('mongoose');
const { logged } = require('../middleware/userauth');
const session = require('express-session');
const Order= require('../model/orderModel');
const Return=require('../model/returnSchema');


const adminLogin = async (req, res) => {
    const name = 'hitman';
    const pass = 'hitman19@';
    const { username, password } = req.body;

    if (username === name && password === pass) {
       
     
        req.session.isAdminLoggedIn=true

        res.redirect('/admin/admin-home');
    } else {
        req.flash('msg', 'something went wrong');
        return res.redirect('/admin/admin-login');
    }
};

const renderAdminLogin = async (req, res) => {
    
    res.render('admin/admin-login', { msg: req.flash('msg') });
  };

  const renderAdminDash = async (req, res) => {
    try {
        
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" }
                }
            }
        ]);

        
        const { month, year } = req.query;

        
        let startDate, endDate;
        if (month && year) {
            startDate = new Date(year, month - 1, 1); 
            endDate = new Date(year, month, 0);
        } else if (month && !year) {
            
            const currentYear = new Date().getFullYear();
            startDate = new Date(currentYear, month - 1, 1);
            endDate = new Date(currentYear, month, 0);
        } else {
            
            const today = new Date();
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = today;
        }

        
        const filteredOrdersCount = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        res.render('admin/admin-home', {
            totalOrders,
            totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0,
            filteredOrdersCount, 
            msg: req.flash('msg')
        });
    } catch (error) {
        console.error('Error rendering admin dashboard:', error);
        res.status(500).render('error', { error: 'Internal Server Error' });
    }
};
 
 

  const adminlogout = (req, res) => {

   
    try{
        req.session.isAdminLoggedIn=false
      
      res.redirect('/admin/admin-login')
    }catch(error){
      console.log(error)
    }
}

const renderUserDashboard = async (req, res) => {
  {
      try {
  
          const PAGE_SIZE = 4
          ;
          const page = parseInt(req.query.page) || 1;
      
          
          const totalCount = await User.countDocuments();
          
      
          const users = await User.find({})
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE);
      
        res.render('admin/dashboard', { users,totalCount,PAGE_SIZE,page });
      } catch (error) {
        res.send(`Error fetching users: ${error.message}`);
      }
    } 
  };

const renderDashboard = async (req, res) => {
  try {
     
      const totalOrders = await Order.countDocuments();
      const totalRevenue = await Order.aggregate([
          {
              $group: {
                  _id: null,
                  totalAmount: { $sum: "$totalAmount" }
              }
          }
      ]);

      
      res.render('admin/dashboard', {
          totalOrders,
          totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0
      });
  } catch (error) {
      console.error('Error rendering admin dashboard:', error);
      res.status(500).render('error', { error: 'Internal Server Error' });
  }
};



const getGraphDetails = async (req, res) => {

  const sales = await Order.aggregate([
      {
          $match: {
              "items.status": "Delivered"
          }
      }
  ]);

  const monthlyRevenue = Array(12).fill(0);
  let year = req.query.year;
  if (year) {
      year = parseInt(year);
  } else {
      year = new Date().getFullYear();
  }
  console.log('year',year)

  sales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
          const saleYear = new Date(sale.createdAt).getFullYear();
          if (year === saleYear) {
              sale.items.forEach((item) => {
                  const deliveredOn = new Date(item.delivered_on);
                  const month = deliveredOn.getMonth();
                  const totalAmount = sale.totalAmount;
                  monthlyRevenue[month] += totalAmount;
              });
          }
      }
  });
  res.json({
      success: true,
      data: monthlyRevenue
  });
}


  const searchUsers = async (req, res) => {
    const { query } = req.query;
    try {
      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      });
      res.render('admin/dashboard', { users });
    } catch (error) {
      res.redirect('/admin/dashboard');
    }
  };

const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { blocked: true });
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(error);
    res.send('Error blocking user');
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { blocked: false });
    res.redirect('/admin/dashboard');
  } catch (error) {
    res.send('Error unblocking user');
  }
};

const getUsers = async (req, res) => {
  try {
    
    const users = await User.find();
    res.render('admin/order-user', { users });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};
const userOrderPage = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const PAGE_SIZE = 10; 

  
    const totalOrders = await Order.countDocuments({ customer_id: userId });
    const totalPages = Math.ceil(totalOrders / PAGE_SIZE);
    const orderDetails = await Order.find({ customer_id: userId })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

   
    res.render('admin/orderDetails', { orderDetails, userId,PAGE_SIZE, currentPage: page, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const get_orders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const PAGE_SIZE = 6;
  const totalOrders = await Order.countDocuments();
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE);

  const orders = await Order.find()
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE);
 

const userId=req.session.userId

let orde = await Order.aggregate([
  {
      $project: {
          _id: 1,
          customer_id: 1,
          items: 1,
          address: 1,
          payment_method: 1,
          status: 1,
          createdAt: 1,
          
      }
  },

  {
      $unwind: { path: '$items' }
  }])
let orderDetails = await Order.aggregate([
      {
          $project: {
              _id: 1,
              customer_id: 1,
              items: 1,
              address: 1,
              payment_method: 1,
              status: 1,
              createdAt: 1,
              
          }
      },
      {
          $unwind: { path: '$items' }
      },
      {
          $lookup: {
              from: 'products',
              localField: 'items.product_id',
              foreignField: '_id',
              as: 'products'
          }
      },
      {
          $unwind: { path: '$products' }
      },
      {
          $lookup: {
              from: 'users',
              localField: 'customer_id',
              foreignField: '_id',
              as: 'userName'
          }
      },
      {
          $unwind: { path: '$userName' }
      },
      {
          $project: {
              _id: 1,
              'userName.name': 1,
              'products.name': 1,
              items: 1,
              address: 1,
              payment_method: 1,
              status: 1,
              createdAt: 1,
              
          }
      },
      {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $skip: (page - 1) * PAGE_SIZE,
        },
        {
          $limit: PAGE_SIZE,
        },
  ]);
  const user=await User.findById(userId)

orderDetails.sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
});

orderDetails.forEach(obj => {
    if (obj?.createdAt) {
        obj.createdAt = formatDate(obj.createdAt);
    }
});

function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return new Date(date).toLocaleDateString(undefined, options);
}







res.render('admin/orderDetails', {
  success: req.flash('success')[0],
  error: req.flash('error')[0],
  orderDetails,
  orderDetails,
  user,
  currentPage: page,
  totalPages,
  PAGE_SIZE
});
}

const userOrders = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await Order.find({ customer_id: userId });


    const page = parseInt(req.query.page) || 1;
  const PAGE_SIZE = 8;
  const totalOrders = await Order.countDocuments({ customer_id: userId });
        const totalPages = Math.ceil(totalOrders / PAGE_SIZE);


  let orderDetails = await Order.aggregate([
    {
        $match: {
          customer_id: new mongoose.Types.ObjectId(userId)
        }
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
        }
    },
    {
        $unwind: { path: '$items' }
    },
    {
        $lookup: {
            from: 'products',
            localField: 'items.product_id',
            foreignField: '_id',
            as: 'products'
        }
    },
    {
        $unwind: { path: '$products' }
    },
    {
        $lookup: {
            from: 'users',
            localField: 'customer_id',
            foreignField: '_id',
            as: 'userName'
        }
    },
    {
        $unwind: { path: '$userName' }
    },
    {
        $project: {
            _id: 1,
            'userName.name': 1,
            'products.name': 1,
            items: 1,
            address: 1,
            payment_method: 1,
            status: 1,
            createdAt: 1,
        }
    },
    {
        $sort: {
            createdAt: -1,
        },
    },
    {
        $skip: (page - 1) * PAGE_SIZE,
    },
    {
        $limit: PAGE_SIZE,
    },
]);

    
    const orders = await Order.find({ customer_id: userId })
                                   .skip((page - 1) * PAGE_SIZE)
                                   .limit(PAGE_SIZE)
                                   .populate('items.product_id')
                                   .populate('customer_id');
    
    res.render('admin/userOrderPage', { orders, userId,orderDetails,currentPage: page,
      totalPages,
      PAGE_SIZE });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};




const renderOrderStatusPage = async (req, res) => {
  console.log("Test 1")
  try {
    
    const orderId = req.query.orderId;

    
    const order = await Order.findById(orderId)
      .populate('customer_id', 'name')
      .populate({
        path: 'items.product_id',
        select: 'name'
      })

    
    if (order) {
      res.render('admin/order-status', { order });
    } else {
     
      res.render('error_page', { error: 'Order not found' });
    }
  } catch (error) {
    
    console.error('Error retrieving order details:', error);
    res.render('error_page', { error: 'Internal Server Error' });
  }
};


const updateOrderStatus = async (req, res) => {
  try {
   
    const { orderId, status } = req.body;

   
    const updatedOrder = await Order.findByIdAndUpdate(orderId, { status: status }, { new: true });

   
    res.redirect(`/admin/orders`);
  } catch (error) {
    
    console.error('Error updating order status:', error);
    res.render('error_page', { error: 'Internal Server Error' });
  }
};

const getOrderStats = async (req, res) => {
  try {
     
      const totalOrders = await Order.countDocuments();
      const totalRevenue = await Order.aggregate([
          {
              $group: {
                  _id: null,
                  totalAmount: { $sum: "$totalAmount" }
              }
          }
      ]);

      
      res.json({
          totalOrders,
          totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0
      });
  } catch (error) {
      console.error('Error fetching order statistics:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
};

const render_change_order_status = async (req, res) => {
  
  
 
  let product_id = new mongoose.Types.ObjectId(req.query.productId);
  let order_id = new mongoose.Types.ObjectId(req.query.orderId);
  let order = await Order.aggregate([
      {
          $match: {
              _id: order_id,
              'items.product_id': product_id
              
          }
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
              totalAmount:1
          }
      },
      {
          $unwind: { path: '$items' }
      },
      {
          $lookup: {
              from: 'products',
              localField: 'items.product_id',
              foreignField: '_id',
              as: 'product'
          }
      },
      {
          $unwind: { path: '$product' }
      },
      {
          $lookup: {
              from: 'users',
              localField: 'customer_id',
              foreignField: '_id',
              as: 'user'
          }
      },
      {
          $unwind: { path: '$user' }
      },
      {
          $project: {
              _id: 1,
              'user.name': 1,
          
              'product.name':1,
              'product.productId': 1,
              items: 1,
              address: 1,
              payment_method: 1,
              status: 1,
              createdAt: 1,
              totalAmount:1
          }
      }
  ]);

  order.forEach(obj => {
      if (obj.items && obj.items.quantity && obj.items.price) {
          obj.items.price = obj.items.quantity * obj.items.price;
      }
  });

  let productIdToFind = req.query.productId

  const showOrder = order.find(order => order.items.product_id.toString() === productIdToFind);

  if (showOrder.items.status === "Delivered") {
      showOrder.items.delivered = true;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = false;
  } else if (showOrder.items.status === "pending") {
      showOrder.items.delivered = false;
      showOrder.items.pending = true;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = false;
  } else if (showOrder.items.status === "confirmed") {
      showOrder.items.delivered = false;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = true;
  } else if (showOrder.items.status === "Shipped") {
      showOrder.items.delivered = false;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = false;
      showOrder.items.shipped = true;
      showOrder.items.confirmed = false;
  } else if (showOrder.items.status === "Out for Delivery") {
      showOrder.items.delivered = false;
      showOrder.items.pending = false;
      showOrder.items.out_forDelivery = true;
      showOrder.items.shipped = false;
      showOrder.items.confirmed = false;
  }

  res.render('admin/orderStatus', { admin: true, showOrder })
}

const update_order_status = async (req, res) => {
  let status = req.body.status;
  let order_id = req.params.id;
  let product_id = req.body.product_id;

  if (status === 'Shipped') {

      //updating status if when Item shipped
      const updateOrder = await Order.updateOne({
          _id: order_id,
          'items.product_id': product_id
      }, {
          '$set': {
              'items.$.status': status,
              'items.$.shipped_on': new Date()
          }
      });
      if (updateOrder) {
          req.flash('success', 'Product status Updated Successfully');
          
          res.redirect('/admin/order-user');
      }
  } else if (status === 'Out for Delivery') {
      const updateOrder = await Order.updateOne({
          _id: order_id,
          'items.product_id': product_id
      }, {
          '$set': {
              'items.$.status': status,
              'items.$.out_for_delivery': new Date()
          }
      });
      if (updateOrder) {
          req.flash('success', 'Product status Updated Successfully');
          res.redirect('/admin/order-user');
      }
  } else if (status === 'Delivered') {
      const updateOrder = await Order.updateOne({
          _id: order_id,
          'items.product_id': product_id
      }, {
          '$set': {
              'items.$.status': status,
              'items.$.delivered_on': new Date()
          }
      });
      if (updateOrder) {
          req.flash('success', 'Product status Updated Successfully');
          res.redirect('/admin/order-user');
      }
  } else {
      req.flash('error', 'Product status Updated Successfully');
      res.redirect('/admin/order-user');
  }
}

const filterOrders = async (req, res) => {
  try {
      
      const { month, year } = req.query;

      let startDate, endDate;
      if (month && year) {
          startDate = new Date(year, month - 1, 1); 
          endDate = new Date(year, month, 0);
      } else if (month && !year) {
        
          const currentYear = new Date().getFullYear();
          startDate = new Date(currentYear, month - 1, 1);
          endDate = new Date(currentYear, month, 0);
      } else {
          const today = new Date();
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = today;
      }

      const filteredOrders = await Order.find({
          createdAt: { $gte: startDate, $lte: endDate }
      });

     
      res.render('admin/dashboard', { filteredOrders });
  } catch (error) {
      console.error('Error filtering orders:', error);
      res.status(500).render('error', { error: 'Internal Server Error' });
  }
};


const get_invoice = async (req, res) => {
    let product_id = new mongoose.Types.ObjectId(req.query.productId);
    let order_id = new mongoose.Types.ObjectId(req.query.orderId);
    let order = await Order.aggregate([
        {
            $match: {
                _id: order_id,
                'items.product_id': product_id
            }
        },
        {
            $project: {
                _id: 1,
                customer_id: 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1
            }
        },
        {
            $unwind: { path: '$items' }
        },
        {
            $lookup: {
                from: 'products',
                localField: 'items.product_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        {
            $unwind: { path: '$product' }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'customer_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $unwind: { path: '$user' }
        },
        {
            $project: {
                _id: 1,
                'user.name': 1,
                'user._id': 1,
                'user.user_email': 1,
                'user.user_mobile': 1,
                'product.name': 1,
                items: 1,
                address: 1,
                payment_method: 1,
                status: 1,
                createdAt: 1
            }
        }
    ]);
    
    order.forEach(obj => {
        if (obj?.createdAt) {
            obj.createdAt = formatDate(obj.createdAt);
        }
    });

    function formatDate(date) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        return new Date(date).toLocaleDateString(undefined, options);
    }

    let productIdToFind = req.query.productId

    const showOrder = order.find(order => order.items.product_id.toString() === productIdToFind);

    function generateRandomInvoiceId() {
        let id = showOrder.items.product_id.toString().slice(3,10);
        const invoiceId = `INV-${id}`;
        return invoiceId;
    }
    const randomInvoiceId = generateRandomInvoiceId();
    showOrder.invoiceId = randomInvoiceId;
    res.render('pdf/invoice', {showOrder })
}

const getNotifications = async (req, res) => {
    const PAGE_SIZE = 8; 
    const page = parseInt(req.query.page) || 1;
    const totalReturns = await Return.countDocuments();
    const totalPages = Math.ceil(totalReturns / PAGE_SIZE);

    try {
        const returns = await Return.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $project: {
                    _id: 1,
                    'user.name': 1,
                    'product.name': 1,
                    order_id: 1,
                    status: 1,
                    comment: 1,
                    reason: 1
                }
            },
            {
                $skip: (page - 1) * PAGE_SIZE
            },
            {
                $limit: PAGE_SIZE
            }
        ]);

        for (let request of returns) {
            request.return = request.status !== 'pending';
        }

        res.render('admin/return', { returns, page, PAGE_SIZE,totalReturns,totalPages });
    } catch (error) {
        console.error(error);
        res.send(error);
    }
};

const aproveRequest = async (req, res) => {
    let return_id = req.params.id;
    const aprove = await Return.findByIdAndUpdate({ _id: return_id }, { $set: { status: 'aproved' } }, { new: true });
    if (aprove) {
        res.json({
            success: true
        })
    }
  };


  const declineRequest = async (req, res) => {
    let return_id = req.params.id;
    const aprove = await Return.findByIdAndUpdate({ _id: return_id }, { $set: { status: 'declined' } }, { new: true });
    if (aprove) {
        res.json({
            success: true
        })
    }
  }







module.exports={
    adminLogin,
    renderAdminLogin,
    renderAdminDash,
    adminlogout,
    renderDashboard,
    searchUsers,
    blockUser,
    unblockUser,
    getUsers,
    userOrderPage,
    get_orders,
    renderOrderStatusPage,
    render_change_order_status,
    update_order_status,
    updateOrderStatus,
    getOrderStats,
    filterOrders,
    renderUserDashboard,
    getGraphDetails,
    userOrders,
    get_invoice,
    getNotifications,
    aproveRequest,
    declineRequest
    
    
    
    



    
    
    
}
