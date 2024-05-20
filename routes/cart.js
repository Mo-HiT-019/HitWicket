const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const { isLoggedIn,block } = require('../middleware/userauth');
const { verifyOTP } = require('../controllers/userController');

const setCommonHeaders = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
 
    next();
  };
  
  
router.use(setCommonHeaders);
 
router.get('/',isLoggedIn,block,setCommonHeaders,cartController.showCart);

router.post('/add-to-cart/:userId/:productId', cartController.addToCart);

router.get('/add-quantity/:productId',isLoggedIn,block,setCommonHeaders, cartController.incrementQuantity);

router.get('/minus-quantity/:productId',isLoggedIn,block, cartController.decrementQuantity);


router.delete('/delete/:productId', cartController.removeItem);

router.get('/checkout',isLoggedIn,block, cartController.renderCheckout);

router.post('/place-order', block,cartController.placeOrder);

router.get('/order-success',isLoggedIn,block,setCommonHeaders,cartController.orderSuccess);

router.post('/verify-payment', cartController.verifyPaymenet)








 


module.exports = router;