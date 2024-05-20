const Order = require('../model/orderModel');

const sales_Report = async () => {



    const sal = await Order.aggregate([
        {
            $match: {
                "items.status": "Delivered"
            }
        },
        {
            $unwind: "$items"
        },
        {
            $match: {
                "items.status": "Delivered"
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "items.product_id",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: "$product"
        },
        {
            $lookup: {
                from: "users",
                localField: "customer_id",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'product.category',
                foreignField: '_id',
                as: 'category'
            }
        },
        {
            $unwind: '$category'
        }
        
          
    ])

    const salesReport = await Order.aggregate([
        {
            $match: {
                "items.status": "Delivered"
            }
        },
        {
            $unwind: "$items"
        },
        {
            $match: {
                "items.status": "Delivered"
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "items.product_id",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: "$product"
        },
        {
            $lookup: {
                from: "users",
                localField: "customer_id",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'product.category',
                foreignField: '_id',
                as: 'category'
            }
        },
        {
            $unwind: '$category'
        },
        
        {
            $project: {
                'product.name': 1,
                'user.name': 1,
                'items.delivered_on': 1,
                createdAt: 1,
                'items.quantity': 1,
                'items.price': 1,
                'category.name': 1,
                payment_method: 1
            }
        }
    ]);
    return salesReport;

}

const renderSalesReport = async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const allSales = await sales_Report();

    
    const salesReport = allSales.slice(startIndex, startIndex + limit);

     
    salesReport.forEach((sales) => {
        sales.createdAt = sales.createdAt.toLocaleDateString();
        sales.items.delivered_on = sales.items.delivered_on.toLocaleDateString();
    });

    const totalPages = Math.ceil(allSales.length / limit);

    let admin = res.locals.admin
    res.render('admin/sales-report', { footer: true, admin: true, Admin: admin, salesReport,currentPage: page,
        totalPages: totalPages,
        limit: limit })

}

const filterData = async (req, res) => {
    let salesReport = await sales_Report();

    if (req.body.from != '') {
        const inputDate = new Date(req.body.from);
        salesReport = salesReport.filter((data) => data.items.delivered_on >= inputDate);
    }

    if (req.body.to != '') {
        const inputDate = new Date(req.body.to)
        salesReport = salesReport.filter((data) => data.items.delivered_on <= inputDate);
    }
    if (req.body.payment_method != '') {
        if (req.body.payment_method === 'COD') {
            salesReport = salesReport.filter((data) => {
                return data.payment_method === 'COD'
            })
        } else if (req.body.payment_method === 'Online Payment') {
            salesReport = salesReport.filter((data) => {
                return data.payment_method === 'Online Payment'
            })
        }
    }

    salesReport.forEach((sales) => {
        sales.createdAt = sales.createdAt.toLocaleDateString();
        sales.items.delivered_on = sales.items.delivered_on.toLocaleDateString();
    })

    res.render('admin/sales-report', {  salesReport });

}

module.exports={
    sales_Report,
    renderSalesReport,
    filterData

}