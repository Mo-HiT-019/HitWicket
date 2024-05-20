var express = require('express');
var multer = require('multer');
var router = express.Router();
const session=require('express-session');
const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));

//controllers
var productController=require('../controllers/productController');
var categoryController=require('../controllers/categoryController');
const adminController = require('../controllers/adminController');

const {isLoggedInAdmin,isLoggedOut} = require('../middleware/adminauth');
const { isLoggedIn,block} = require('../middleware/userauth');


const disableCache = (req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
};
router.use(disableCache)
router.use(
  session({
    secret: 'adminSecret',
    resave: false,
    saveUninitialized: true,
  })
);

var path = require("path");
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
   
    try {
      const destinationPath = path.join(__dirname, '../public/images');
      cb(null, destinationPath);
    } catch (error) {
      cb(error); 
    }
  },
  filename: function(req, file, cb) {
   
    try {
      const name = Date.now() + '-' + file.originalname;
      cb(null, name);
    } catch (error) {
      cb(error); 
  } 
}});

const upload = multer({storage:storage})






router.get('/', isLoggedInAdmin,disableCache, adminController.renderAdminDash);

router.get('/admin-login',isLoggedOut,disableCache, adminController.renderAdminLogin,);

router.post('/admin-login', adminController.adminLogin);

router.get('/logout',isLoggedInAdmin,disableCache, adminController.adminlogout);


router.get('/admin-home',isLoggedInAdmin, adminController.renderAdminDash);

 
router.get('/view-products',isLoggedInAdmin,productController.viewProducts);

router.get('/view-category',isLoggedInAdmin, categoryController.renderviewCategory);


router.get('/add-category', (req, res) => {
  res.render('admin/add-category', {errorMessage: req.flash('errorMessage')});
  
});

router.get('/dashboard',isLoggedInAdmin, adminController.renderUserDashboard);

router.get('/view-users',isLoggedInAdmin,adminController.searchUsers);

router.get('/unblock/:id', adminController.unblockUser);

router.get('/block/:id', adminController.blockUser,block);

router.get('/orders',isLoggedInAdmin,adminController.get_orders);

router.get('/order-user',isLoggedInAdmin,adminController.getUsers);

router.get('/orders/:userId',isLoggedInAdmin,adminController.userOrders);

router.get('/manage-order',isLoggedInAdmin, adminController.render_change_order_status);

router.post('/changeStatus/:id', adminController.update_order_status)

router.get('/edit-orderstatus',isLoggedInAdmin,adminController.renderOrderStatusPage);

router.post('/update-orderstatus',isLoggedInAdmin,adminController.updateOrderStatus);

router.get('/view-invoice',isLoggedInAdmin, adminController.get_invoice);

router.get('/return',isLoggedInAdmin, adminController.getNotifications);

router.get('/approve/:id',isLoggedInAdmin, adminController.aproveRequest);

router.get('/decline/:id',isLoggedInAdmin,adminController.declineRequest);



module.exports = router;