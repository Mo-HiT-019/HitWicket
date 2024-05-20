const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController')
const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));


const {isLoggedInAdmin,isLoggedOut} = require('../middleware/adminauth');




// Product Routes
// Add Product
router.get('/add-product',productController.renderAddProduct);

router.post('/add-product',productController.upload.array('images', 5), productController.addProduct);

router.get('/view-products',productController.viewProducts);

router.get('/edit-product/:productId',isLoggedInAdmin, productController.editProduct);

router.post('/edit-product/:productId', productController.upload.array('newImages', 5), productController.updateProduct);

router.get('/delete-product/:productId',isLoggedInAdmin, productController.deleteProduct);


// Category Routes

router.post('/add-category', categoryController.addCategory);
 
router.get('/category-product', productController.viewProductsByCategory);


module.exports = router; 