const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;



const returnRequestSchema = new Schema({
    order_id: {
        type: ObjectId,
        ref: 'Order'
    },
    product_id: {
        type: ObjectId,
    },
    user_id: {
        type: ObjectId,
        ref: 'User'
    },
    reason: {
        type: String,
    },
    status: {
        type: String,
    },
    comment: {
        type: String
    }
});

module.exports = mongoose.model('Return', returnRequestSchema);