const express = require('express');
const categoryController = require('../controllers/categoryController'); 
const router = express.Router();







router.post('/add-category',categoryController.addCategory);

router.get('/edit-category/:id',categoryController.rendereditCategory)

router.post('/update-category/:id',categoryController.updateCategory);

router.get('/delete-category/:id',categoryController.renderdeleteCategory)

module.exports = router;
