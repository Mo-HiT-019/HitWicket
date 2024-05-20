const Category = require('../model/categoryModel');
const Product = require('../model/productModel');
const User=require('../model/userModel');
const flash=require('connect-flash')

const { v4: uuidv4 } = require('uuid');



exports.isLoggedIn=(req,res,next)=>{
  if(req.session.user){
  
    next()
  }else{
    console.log('hai')
    res.render('user/login',{msg:req.flash('errorMessage')} )
   
    
    
  }}

exports.block = async (req, res, next) => {
  if (req.session.user) {
    const user = req.session.user;
    const userD = await User.findById(user._id);
    if (userD.blocked) {
      console.log('welcome');
      req.flash('errorMessage', `Sorry ${user.name}, your account has been blocked`);
      delete req.session.user
      return res.redirect('/');
       // Add return here to end the function
    }
  }
  next();
};



exports=async(req,res,next)=>{
  try{
    if(req.session.adm){
      res.redirect('/admin/admin-ho')
      
    }else{
      next()
    }
  }catch(error){
    console.log(error)
  }
}













