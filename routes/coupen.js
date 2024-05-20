const express = require('express');
const router = express.Router();
const {isLoggedInAdmin} = require('../middleware/adminauth');

const coupenController = require('../controllers/coupenController');

router.get('/',isLoggedInAdmin,coupenController.renderCoupen_page);

router.get('/new-coupen', isLoggedInAdmin,coupenController.renderNew_coupen);

router.post('/create-coupen',  coupenController.createNew_coupen);

router.get('/edit_coupen/:id',isLoggedInAdmin, coupenController.editCoupen);

router.post('/edit-coupen/:id', coupenController.updateCoupen);

router.get('/delete-coupen/:id',isLoggedInAdmin, coupenController.deleteCoupen);


module.exports=router;