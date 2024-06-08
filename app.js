var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session=require('express-session')
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();
const mongoose = require("mongoose");
const flash = require('express-flash');

const dbURI=process.env.MONGODB_URI;

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

 
var app = express();
app.use(flash());

const PORT=process.env.PORT||3000;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

 


app.set('layout directory', path.join(__dirname, 'views/layouts'));
app.set('partials directory', path.join(__dirname, 'views/partials'));

 

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'secrethitkey', 
  resave: false,
  maxAge: 1000 * 60 * 60,
  saveUninitialized: true
}));





var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var productRouter = require('./routes/product');
var categoryRouter = require('./routes/category');
var productSearchRouter = require('./routes/productSearchRoute');
const cartRouter=require('./routes/cart');
const orderRouter=require('./routes/order');
const coupenRouter=require('./routes/coupen');
const salesRouter=require('./routes/sales');






app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/product',productRouter)
app.use('/category',categoryRouter);
app.use('/search',productSearchRouter);
app.use('/cart',cartRouter);
app.use('/order',orderRouter);
app.use('/coupen',coupenRouter);
app.use('/sales',salesRouter);


 
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message; 
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500); 
  res.render('error');
});

app.listen(PORT,()=>{
  console.log(`Server started at ${PORT}`);
})
module.exports = app;
 