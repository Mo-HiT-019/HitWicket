const express = require('express');
const session = require('express-session');
const flash=require('express-flash')
const { MongoClient } = require('mongodb');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const User = require('../model/userModel');
const Product = require('../model/productModel');
const Category = require('../model/categoryModel');
const Address = require('../model/addressModel');

const disableCache = (req, res, next) => {
  console.log('disableCache middleware');
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
};



const error=(req,res)=>{
  res.render('/error')
}
const renderLogin = async (req, res) => {
  
  console.log('/login route handler');
  const successMessage=req.flash('successMessage')
  const errorMessage = req.flash('errorMessage');
  if (errorMessage.length > 0 || successMessage>0) {
    return res.render('user/login', { msg: errorMessage,successMessage });
  }


  if (req.session.user) {
    return res.redirect('/home');
  }

};



const login = async (req, res) => {
  console.log("CHeck 1");
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    console.log("CHeck 2 ");

    if (user && (await bcrypt.compare(password, user.password))) {
      console.log("CHeck 3");
      if (user.blocked) {
        console.log(user);
        req.flash('errorMessage', 'Sorry, your account has been blocked');
        return res.redirect('/');
      } else {
        console.log("CHeck 3");
        // Set session user
        req.session.user = user;
        console.log('req.session',req.session)
        console.log('Session user set:', req.session.user);
        console.log('User logged in. Session ID:', req.sessionID);
        
        // Redirect to home
        return res.redirect('/home');
      }
    } else if (!user) {
      console.log('check not user')
      req.flash('errorMessage', 'Email is not valid');
      return res.redirect('/');
    } else if (user.password != password) {
      req.flash('errorMessage', 'Password is not valid');
      return res.redirect('/');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return res.redirect('/error');
  }
};

const renderSignup = (req, res) => {
  res.render('user/signup',{msg:req.flash('errorMessage')});
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return passwordRegex.test(password);
};

let otpStorage = {};

const OTP_EXPIRATION_TIME = 2 * 60 * 1000;

const signup = async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    if (!validateEmail(email)) {
      req.flash('errorMessage','Invalid email');
        return res.redirect('/signup')
    }

    if (!validatePassword(password)) {
      req.flash('errorMessage','Invalid Password');
       return res.redirect('/signup')
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('errorMessage', 'User already exists');
      return res.redirect('/signup');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiration = Date.now() + OTP_EXPIRATION_TIME;
    console.log('Generated OTP:', otp);

    otpStorage[email] = { otp, name, number, password, otpExpiration };
    console.log('Stored OTP:', otpStorage[email]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ajith2001mohith2@gmail.com',
        pass: 'mbmg hnnb dglk cwfu',
      },
      
    });
    
    console.log('sdfsdf')
    
    await transporter.sendMail({
      from: 'ajith2001mohith2@gmail.com',
      to: email,
      subject: 'Registration OTP',
      text: `Your OTP for registration is ${otp}`,
    });
   console.log('comeon')
    res.redirect(`/match-otp?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Error signing up:', error);
    res.locals.error_messages = ['An unexpected error occurred'];
    return res.render('user/signup');
  }
};

const renderMatchOTP = (req, res) => {
  const { email } = req.query;
  const remainingTime = otpStorage[email] ? otpStorage[email].otpExpiration - Date.now() : 0;


  if (email) {
    res.render('user/signup-otp', { email,remainingTime });
  } else {
    res.send('Invalid request');
  }
};

const matchOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedData = otpStorage[email];

    if (!storedData) {
      console.log('User data not found');
      res.send('User data not found');
      return;
    }

    if (Date.now() > storedData.otpExpiration) {
      console.log('OTP has expired');
      res.send('OTP has expired');
      return;
    }

    console.log('Request received. Email:', email, 'OTP:', otp);
    console.log('Stored OTP:', storedData.otp);

    if (otp == storedData.otp) {
      console.log('Entered OTP matches Stored OTP');

      const hashedPassword = await bcrypt.hash(storedData.password, 10);
      const newUser = new User({
        email,
        name: storedData.name,
        password: hashedPassword,
        number: storedData.number,
      });

      await newUser.save();

      delete otpStorage[email];
      req.flash('successMessage', 'Your account has been successfully registered');
      return res.redirect('/');
      

    } else {
      console.log('Entered OTP does not match Stored OTP');

      res.send('Invalid OTP');
    }
  } catch (error) {
    console.error('Error matching OTP:', error);
    res.send('Internal Server Error');
  }
};

const PAGE_SIZE = 8;

const renderHome = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  

    if (req.session.user) {
      
      const user = req.session.user;
      const email = user.email;
      const usr = await User.findOne({ email });

      if (user.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${user.name},Your account has been blocked`);
        return res.redirect('/login'); 
      }

      const page = req.query.page || 1; 


      const totalProducts = await Product.countDocuments();
      const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

      const products = await Product.find()
        .skip((page - 1) * PAGE_SIZE) 
        .limit(PAGE_SIZE); 

      const categories = await Category.find();
      const isHomePage=true

      res.render('user/home', {
        isHomePage,
        products,
        categories,
        msg: req.flash('errorMessage'),
        currentPage: parseInt(page),
        totalPages,
      });
    }
  } catch (error) {
    console.error('Error rendering home:', error);
    req.flash('errorMessage', 'An unexpected error occurred');
    res.redirect('/error');
  }
};


const calculateQuantity = (req) => {
  return req.query.quantity || 1; 
};

const renderProductDetail = async (req, res) => {
  try {
    if (req.session.user) {

      const user = req.session.user;
      console.log('user',user)
      const productId = req.params.id;
     

      

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.redirect('Invalid product ID');
      }

      const product = await Product.findById(productId).populate('category');

      if (!product) {
        return res.send('Product not found');
      }
      console.log('prod',product)

      let discountedPrice = null;
      let discount = null;
      let offerStartDate = null;
      let offerEndDate = null;

      if (product.offers && product.offers.length > 0) {
        const offer = product.offers[0];
        discount = offer.discount;

        const currentDate = new Date();
        if (offer.startDate <= currentDate && currentDate <= offer.endDate) {
         
          discountedPrice = product.price - (product.price * (discount / 100));
          offerStartDate = offer.startDate;
          offerEndDate = offer.endDate;
        }
      }

      if (product.offers && product.offers.length > 0) {
        product.offers[0].discountedPrice = discountedPrice;
        await product.save();
      }
      const isHomePage = false

      // Include offerStartDate and offerEndDate in the rendering context
      return res.render('user/product-detail', {
        isHomePage,
        user,
        product,
        productId,
        discountedPrice,
        discount,
        offerStartDate,
        offerEndDate,
      });
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.log(error)
    res.redirect('/error');
  }
};

const renderforgotPassword = async(req, res) => {
 
  res.render('user/forgot-password');
  };

const logout = async (req, res) => {
  try {
    if (req.session.user) {
      console.log('dsfsf')
      console.log('user',req.session.user)
     delete req.session.user;
      
    }
    res.redirect('/');
  } catch (error) {
    res.redirect('/error');
  }
};

const sendOtpForPassword = async (req, res) => {
  console.log('sdfdsf')
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.send({ error: 'User not found' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'ajith2001mohith2@gmail.com',
        pass: 'mbmg hnnb dglk cwfu',
      },
    });

    const randomNum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
const otpExpirationTime = new Date();
otpExpirationTime.setMinutes(otpExpirationTime.getMinutes() + 1);
console.log("Otp is",randomNum );


user.otp = {
  code: randomNum,
  expirationTime: otpExpirationTime,
  generationTime: new Date(),
};

await user.save();



    const mailDetails = {
      from: 'ajith2001mohith2@gmail.com',
      to: email,
      subject: 'Your OTP for App',
      html: `<p>Dear User,</p>
        <p>Your OTP is: <strong>${randomNum}</strong></p>
        <p>OTP will expire at: ${otpExpirationTime.toLocaleString()}</p>
        <p>Please use this OTP within the next minute to complete your authentication.</p>
        <p>Thank you,</p>
        <p>[Your Company/Organization Name]</p>`,
       
    };

    transporter.sendMail(mailDetails, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return res.send({ error: 'Error sending email' });
      } else {
        res.redirect(`/verify-password?email=${email}`);
      }
    });
  } catch (error) {
    console.error(error);
    return res.redirect('/error');
  }
};

const verifyPassword= async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.send({ error: 'Email parameter is missing' });
  }

  try {
    const user = await User.findOne({ email });
    const otpExpirationTime = user.otp.expirationTime;
    res.render('user/verify-password', { email, user,otpExpirationTime,msg:req.flash('errorMessage')});
  } catch (error) {
    console.error(error);
    return res.redirect('/error');
  }
};

const verifyPasswordOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log('Email:', email);
    console.log('Submitted OTP:', otp);
    const user = await User.findOne({ email });

    console.log('User from DB:', user);

    if (!user) {
      return res.send({ error: 'User not found' });
    }

    // Check if the OTP has expired
    const currentTime = new Date();
    if (user.otp.expirationTime && currentTime > user.otp.expirationTime) {
      console.log('OTP has expired');
      // Clear the expired OTP
      user.otp = {
        code: null,
        expirationTime: null,
        generationTime: null,
      };
      await user.save();
      req.flash('errorMessage', 'OTP has expired');
      return res.redirect(`/verify-password?email=${user.email}`);
        }


    if (user.otp.code !== parseInt(otp, 10)) {
      return res.send({ error: 'Invalid OTP' });
    }

    user.isVerified = true;
    // Clear the OTP after successful verification
    user.otp = {
      code: null,
      expirationTime: null,
      generationTime: null,
    };
    await user.save();

    if (user.blocked) {
      return res.send({ message: `${user.email} is blocked` });
    }

    if (user) {
      res.redirect(`/confirm-password?email=${email}`);
    }
  } catch (error) {
    console.error(error);
    return res.redirect('/error');
  }
};

const confirmPassword=async(req,res)=>{
  const email = req.query.email;
  if (!email) {
    return res.send({ error: 'Email parameter is missing' });
  }

  try {
    const user = await User.findOne({ email });
    res.render('user/confirm-password', { email, user });
  } catch (error) {
    return res.redirect('/error');
  }
}

const newPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body;

    const storedData = await User.findById(userId);

    if (storedData) {
     
      const hashedPassword = await bcrypt.hash(password, 10);


      storedData.password = hashedPassword;
      await storedData.save();
      req.flash('successMessage', `password changed successfully`);
      return res.redirect('/');

    
    }

    res.status(404).send('User not found');
  } catch (error) {
    console.error('Error updating password:', error);
    res.redirect('/error');
  }
};


const renderUserProfile = async (req, res) => {
  try {
    if (req.session.user) {
      const use = req.session.user;
      
      const email = use.email;
      const usr = await User.findOne({ email });

      if (usr.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${use.name},Your account has been blocked`);
        return res.redirect('/'); 
      }
    }
    const userId = req.session.user;
    const user = await User.findById(userId);
    const addresses=await Address.find()
    if (!user) {
      console.log('User not found');
    }
    const isHomePage = false

    res.render('user/user-profile', { user: user,addresses:addresses,msg:req.flash('errorMessage'),isHomePage  }); // Pass 'user' to the template
  } catch (error) {
    console.log(error);
    res.redirect('/error')
  }
};

const renderAddress = async (req, res) => {
  try {
    let id = req.session.user._id;
    const userData = await User.findById(req.session.user._id)    
    const addresses = await Address.find({ user_id: id, delete: false });
    const isHomePage = false
    res.render('user/my-address', {
      isHomePage,
      addresses,
      userData: userData, // Assuming userData is a Mongoose document
    });
  } catch (error) {
    res.redirect('/error');
    console.error(error);
  
  }
};

const add_newAddress = async (req, res) => {
  const {
    address_cust_name,
    phone,
    house_name,
    area_street,
    locality,
    town,
    state,
    pincode,
    landmark,
    alternate_phone,
    customer_id,
    address_type,
  } = req.body;
  try {
    // Check if required fields are present
    if (!address_cust_name || !customer_id) {
      throw new Error('address_cust_name and customer_id are required fields');
    }

    // Create the address using the correct field names
    await Address.create({
      address_user_name: address_cust_name,
      user_id: customer_id,
      phone,
      house_name,
      area_street,
      locality,
      town,
      state,
      pincode,
      landmark,
      alternate_phone,
      address_type,
    });

    req.flash('success', 'Address added successfully');
    res.redirect('/my-address');
  } catch (error) {
    // Handle validation errors or other errors
    req.flash('error', 'Error adding address');
    res.redirect('/user/my-address');
  }
};


const renderEditUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }
    const isHomePage = false

    res.render('user/user-profile-edit', { user,isHomePage });
  } catch (error) {
    res.redirect('/error');
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    user.name = req.body.name;
    user.email = req.body.email;
    user.number = req.body.number;
    const newPassword = req.body.password;
    if (newPassword) {
      // Hash the new password before saving it
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      user.password = hashedPassword;
    }

    await user.save();

    res.redirect('/user-profile'); // Redirect to the user profile page or wherever you want to redirect after the update
  } catch (error) {
    res.redirect('/error');
  }
};

const render_editAddress = async (req, res) => {
  let id = req.params.id;
  const address = await Address.findOne({ _id: id });
  const isHomePage = false
  
  res.render('user/edit-address', { isHomePage, address })
}

const update_userAddress = async (req, res) => {
  let id = req.params.id;
  let data = req.body;
  const updateAddress = await Address.findOneAndUpdate({ _id: id }, data, { new: true });
  req.flash('success', 'address updated successfully');
  res.redirect('/my-address');
}

const delete_address = async (req, res) => {
  const addressId = req.params.id;

  try {
      
      const deletedAddress = await Address.findByIdAndDelete(addressId);

      if (!deletedAddress) {
          
          return res.status(404).json({ success: false, message: 'Address not found' });
      }

      res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
      console.error('Error deleting address:', error);
      res.redirect('/error');
  }
};



const addToWishlist = async (req, res) => {
  try {

    console.log("Check 1");

    const userId = req.params.userId;
    const user = await User.findById(userId);
    
    const productId = req.params.productId;
    

    console.log("Check 3");
    if (!user) {
      console.log("Check 3 user error");
      req.flash('error', 'User not found');
      return res.redirect('/error');
    }

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      console.log("Check 3 product error");
      req.flash('error', 'Product not found');
      return res.redirect('/error');
    }

    console.log("Check 1");

    // Check if the product is already in the wishlist
    const isProductInWishlist = user.wishlist.includes(productId);
    if (isProductInWishlist) {
      req.flash('errorMessage', 'Product already in wishlist');
      return res.redirect('/wishlist');
    }
     
    console.log("Check 2");
    // Add the product to the wishlist
    user.wishlist.push(productId);

    // Save the updated user object
    await user.save();

    // Redirect the user to the wishlist page
    req.flash('success', 'Product added to wishlist successfully');
    res.redirect('/wishlist');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/error');
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.params.productId;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/error');
    }

    // Check if the product is in the wishlist
    const productIndex = user.wishlist.findIndex(item => item.equals(productId));

    if (productIndex === -1) {
      req.flash('errorMessage', 'Product not found in wishlist');
      return res.redirect('/wishlist');
    }

    // Remove the product from the wishlist
    user.wishlist.splice(productIndex, 1);

    // Save the updated user object
    await user.save();

    // Redirect the user to the wishlist page
    req.flash('success', 'Product removed from wishlist successfully');
    res.redirect('/wishlist');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal Server Error');
    res.redirect('/error');
  }
};


const renderWishlist=async (req, res) => {
  try {
    if (req.session.user) {
      const use = req.session.user;
      
      const email = use.email;
      const usr = await User.findOne({ email });

      if (usr.blocked === true) {
        console.log('welcome');
        req.flash('errorMessage', `Sorry ${use.name},Your account has been blocked`);
        return res.redirect('/'); // Add return here to end the function
      }
    }

    const userId = req.session.user;
   const user = await User.findById(userId).populate('wishlist');

    // Render wishlist page and pass user's wishlist data
    res.render('user/wishlist', { user });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to fetch wishlist');
    res.redirect('/error');
  }
};


const wallet=async(req,res)=>{
  const user=req.session.user
 
const isHomePage=false
res.render('user/user_wallet',{user,isHomePage})
}


module.exports={
  disableCache,
  error,
  renderLogin,
  login,
  renderSignup,
  signup,
  renderMatchOTP,
  matchOTP,
  renderHome,
  renderProductDetail,
  logout,
  renderforgotPassword,
  sendOtpForPassword,
  verifyPassword,
  verifyPasswordOTP,
  confirmPassword,
  newPassword,
  renderUserProfile,
  renderAddress,
  add_newAddress,
  renderEditUser,
  updateUser,
  render_editAddress,
  update_userAddress,
  delete_address,
  wallet,
  addToWishlist,
  renderWishlist,
  removeFromWishlist
  
 
}