const express = require('express');
const router = express.Router();
const { isLoggedInAdmin} = require('../middleware/adminauth');

const { renderSalesReport,
    filterData } = require('../controllers/salesReportController');

router.get('/sales',isLoggedInAdmin,renderSalesReport);

router.post('/filter',filterData)
    
    
module.exports = router;