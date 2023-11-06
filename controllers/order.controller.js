const User = require('../models/user.model');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const asyncHandler = require('express-async-handler');
const { validateMongodbId } = require('../utils/validateMongodbId');
const uniqid = require('uniqid');

// Place Order... only one 
/** POST: {{base_url}}/api/order
 * body: {
    "COD":true,
    "couponApplied": true
}
*/
const createOrder = asyncHandler(async(req,res)=>{
    const { COD, couponApplied } = req.body;
    const { _id } = req.user;
    validateMongodbId(_id);
    try{
        if(!COD) throw new Error('Create Cash Order Failed');
        const user = await User.findById(_id);
        let userCart = await Cart.findOne({ orderby: user._id });
        let finalAmount = 0; 
        if(couponApplied && userCart.totalAfterDiscount) {
            finalAmount = userCart.totalAfterDiscount + 100;
        } else {
            finalAmount = userCart.cartTotal + 100;
        }

        let newOrder = await new Order({
            products: userCart.products,
            paymentIntent: {
                id: uniqid(),
                method: 'COD',
                amount: finalAmount,
                status: 'Cash on Delivery',
                created: Date.now(),
                currency: '₹',
            },
            orderby: user._id,
            orderStatus:'Cash on Delivery',
        }).save();
        
        let update = userCart.products.map(item => {
            return {
                updateOne: {
                    filter: {_id: item.product._id },
                    update: {$inc: {quantity: -item.count, sold: +item.count}},
                },
            };
        });
        const updated = await Product.bulkWrite(update, {});
        res.json({ message: "success"});
    }catch(err){
        throw new Error(err);
    }
});
// Place all Order at once...  
/** POST: {{base_url}}/api/order
 * body: {
    "COD":true,
    "couponApplied": true
}
*/
const createAllOrder = asyncHandler(async(req,res)=>{
    const { COD, couponApplied } = req.body;
    const { _id } = req.user;
    validateMongodbId(_id);
    try{
        if(!COD) throw new Error('Create Cash Order Failed');
        const user = await User.findById(_id);
        let userCart = await Cart.find({ orderby: user._id });
        let finalAmount = 0; 
        if(couponApplied && userCart.totalAfterDiscount) {
            finalAmount = userCart.totalAfterDiscount + 100;
        } else {
            userCart.forEach(el=>{
                finalAmount += el.cartTotal;
            })
            finalAmount +=  100;
        }

        let newOrder = await new Order({
            products: userCart.products,
            paymentIntent: {
                id: uniqid(),
                method: 'COD',
                amount: finalAmount,
                status: 'Cash on Delivery',
                created: Date.now(),
                currency: '₹',
            },
            orderby: user._id,
            orderStatus:'Cash on Delivery',
        }).save();
        
        let update = userCart.products.map(item => {
            return {
                updateOne: {
                    filter: {_id: item.product._id },
                    update: {$inc: {quantity: -item.count, sold: +item.count}},
                },
            };
        });
        const updated = await Product.bulkWrite(update, {});
        res.json({ message: "success"});
    }catch(err){
        throw new Error(err);
    }
});


// Get all orders of user
/** GET: {{base_url}}/api/order */
const getUserOrders = asyncHandler(async (req, res)=>{
    const { _id } = req.user;
    validateMongodbId(_id);
    try{
        const userOrders = await Order.find({ orderby: _id});
        res.json(userOrders);
    }catch(err){
        throw new Error(err);
    }
});

// get user order by order id 
/** GET: {{base_url}}/api/order/:id */
const getUserOrder = asyncHandler(async (req, res)=>{
    const { _id } = req.user;
    const { id } = req.params;
    validateMongodbId(_id);
    try{
        const userOrders = await Order.findOne({ orderby: _id, _id: id});
        res.json(userOrders);
    }catch(err){
        throw new Error(err);
    }
});

// get all order
/**GET: {{base_url}}/api/order/list */
const getAllOrder = asyncHandler(async(req,res)=>{
    try{
        const orders = await Order.find();
        res.json(orders);
    }catch(err){
        throw new Error(err);
    }
});

// get order by order id 
/** GET: {{base_url}}/api/order/list/:id */
const getOrder = asyncHandler(async (req, res)=>{
    const { id } = req.params;
    validateMongodbId(id);
    try{
        const userOrders = await Order.findOne({ _id: id});
        return res.json(userOrders);
    }catch(err){
        throw new Error(err);
    }
});

// PUT:http://127.0.0.1:1000/v3/api/order/update-status/:id 
/**body {
    "status":"Processing"
}
*/
/**
 * enum: ['Not Processed','Cash on Delivery','Processing','Disptch','Cancelled','Delivered']
 */
const updateOrderStatus = asyncHandler( async(req, res)=>{
    const { status } = req.body;
    const { id } = req.params;
    validateMongodbId(id);
    try{
        const updatedOrderStatus = await Order.findByIdAndUpdate(id, {
            orderStatus: status,
            paymentIntent: {
                status,
            }
        }, {
            new: true,
        });
        res.json(updatedOrderStatus);
    }catch(err){
        throw new Error(err);
    }
});


module.exports = {
    createOrder, createAllOrder,
    getUserOrders, getUserOrder, getAllOrder, getOrder, 
    updateOrderStatus,
}