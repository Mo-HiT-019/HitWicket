var express = require('express');
var router = express.Router();
const session = require("express-session");
const userController = require('../controllers/userController');
const { isLoggedIn,block} = require('../middleware/userauth');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'public/images/product');
  },
  filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const setCommonHeaders = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  next();
};

router.use(setCommonHeaders);



router.get('/',isLoggedIn,userController.renderLogin);

router.post('/login', userController.login);

router.get('/signup', userController.renderSignup);

router.post('/signup', userController.signup);

router.get('/match-otp', userController.renderMatchOTP);

router.post('/match-otp', userController.matchOTP);

router.get('/home',setCommonHeaders, userController.renderHome);

router.get('/user/product-detail/:id',isLoggedIn,block,setCommonHeaders,userController.renderProductDetail);

router.get('/logoutt',userController.logout);

router.get('/forgot-password',userController.renderforgotPassword);

router.post('/forgot-password', userController.sendOtpForPassword);

router.get('/verify-password',userController.verifyPassword)

router.get('/confirm-password',userController.confirmPassword);

router.post('/confirm-password', userController.verifyPasswordOTP);

router.post('/new-password/:id',userController.newPassword);

router.get('/user-profile',isLoggedIn,block,setCommonHeaders,userController.renderUserProfile);

router.get('/my-address/',isLoggedIn,block,setCommonHeaders,userController.renderAddress);

router.post('/my-address/new-address',userController.add_newAddress);

router.post('/checkout/new-address',userController.add_newAddress);

router.get('/user-profile-edit/:userId',isLoggedIn,setCommonHeaders,userController.renderEditUser)

router.post('/user-profile-edit/:userId', isLoggedIn, userController.updateUser);

router.get('/my-address/edit-address/:id',isLoggedIn,block,setCommonHeaders,userController.render_editAddress);

router.post('/my-address/update-address/:id',userController.update_userAddress);

router.delete('/my-address/delete/:id', userController.delete_address);

router.get('/wishlist',userController.renderWishlist);

router.post('/add-to-wishlist/:userId/:productId',userController.addToWishlist);

router.post('/remove-from-wishlist/:userId/:productId',userController.removeFromWishlist);

router.get('/wallet',isLoggedIn,block,setCommonHeaders,userController.wallet);

 
module.exports = router;
