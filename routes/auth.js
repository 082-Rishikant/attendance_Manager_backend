const express = require('express');
const User = require('../models/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middlewares/fetchuser')
var nodemailer = require("nodemailer");
const { roles } = require('../Roles');

require('dotenv').config();
const JWT_secret = process.env.JWT_SECRET_KEY;

// ************ USER AREA ************

// Router -1 '/api/auth/createuser'
router.post('/createuser',
  [
    body('email', 'Enter valid email').isEmail(),
    body('firstName', 'Enter valid firstName').isLength({ min: 3 }),
    body('lastName', 'Enter valid lastName').isLength({ min: 3 }),
    body('institute', 'Enter valid institute').isLength({ min: 3 }),
    body('department', 'Enter valid department').isLength({ min: 2 }),
    body('password').isLength({ min: 5 }),
    body('cpassword').isLength({ min: 5 })
  ], async (req, res) => {
    // Check Whether user with same email id exist or not
    try {
      // Check for vaidation whether is any rule(defined in User model) breaked or not
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array(), from: "validation" });
      }

      const { email, firstName, lastName, institute, department, password, cpassword } = req.body;

      let user = await User.findOne({ email: email });
      if (user) {
        return res.status(400).json({ success: false, message: "Sorry user with same email id already exist", from: "email already Exist" });
      }

      if (password !== cpassword) {
        return res.status(400).json({ success: false, message: "password and confirm password do not match", from: "password!=cpassword" });
      }

      // hashing of password
      const salt = await bcrypt.genSalt(10);
      const securePassword = await bcrypt.hash(password, salt);

      let role = roles.CLIENT;
      if (email === process.env.ADMIN_EMAIL1 || email === process.env.ADMIN_EMAIL2) {
        role = roles.ADMIN;
      }

      // create A new User
      user = await User.create({
        firstName: firstName,
        lastName: lastName,
        institute: institute,
        department: department,
        email: email,
        role: role,
        password: securePassword
      })

      // returning user id in Token
      const data = { user: { id: user.id } };
      const auth_token = jwt.sign(data, JWT_secret);
      res.json({ success: true, auth_token: auth_token });
    } catch (error) {
      res.status(500).send({ success: false, message: error, from: "Internal server error" });
    }
  })

// Router -2 '/api/auth/loginuser'
router.post('/loginuser',
  [
    body('email', 'Enter valid email').isEmail(),
    body('password').isLength({ min: 5 })
  ], async (req, res) => {
    try {
      // Check for vaidation whether is any rule(defined in User model) breaked or not
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array(), from: "validation" });
      }

      const { email, password } = req.body;

      let user = await User.findOne({ email: email });
      if (!user) {
        return res.status(400).json({ success: false, message: "Sorry user with this email id does not exist", from: "email already Exist" });
      }

      if (user.isBlocked) {
        return res.status(401).json({ success: false, message: "Sorry You are Blocked by admin", from: "You are Blocked" });
      }

      // Now Comparing password with help of bcryptjs
      const comparepassword = await bcrypt.compare(password, user.password);
      if (!comparepassword) {
        return res.status(401).json({ success: false, message: "You have entered wrong password or email id", from: "Your password is incoorect" });
      }

      // returning user id in Token
      const data = { user: { id: user.id } };
      const auth_token = jwt.sign(data, JWT_secret);
      res.json({ success: true, auth_token: auth_token });
    } catch (error) {
      res.status(500).send({ success: false, message: error.message, from: "Catch Section | Login part" });
    }
  })

// Route:3 - Get Loggedin User details using:POST  "/api/auth/getuser"  Login required
router.post('/getuser', fetchuser, async (req, res) => {
  try {
    const userid = req.user_id;
    const user = await User.findById(userid).select("-password");
    res.send({ success: true, user: user });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message, from: "getUser details Catch Section" });
  }
})

// Route:4 - Get User details By using Id:POST.  "/api/auth/getUserById/:id".  Login required
router.get('/getUserById/:id', fetchuser, async (req, res) => {
  try {
    const uploader = await User.findById(req.params.id).select("-password");//except password
    res.send({ success: true, uploader: uploader });
  } catch (error) {
    res.status(509).json({ success: false, message: error.message, from: "Catch Section" });
  }
})


// ************ ADMIN AREA ************

// Router:1 - fetch All user | ADMIN access only
router.get('/getAllUsers', fetchuser, async (req, res) => {
  try {
    const user = await User.findById(req.user_id);
    if (user.role !== roles.ADMIN || user.isBlocked) {
      return res.status(401).send({ success: false, message: "You are not allowed to do so!!", from: "Not admin or Blocked" });
    }

    const allusers = await User.find();
    res.send({ success: true, allusers: allusers });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message, from: "getAllUsers | Catch Section" });
  }
});

// Route:2 - Block a User | ADMIN Access Only
router.put('/blockAUser/:id', fetchuser, async (req, res) => {
  try {
    const user = await User.findById(req.user_id).select("-password");
    let target = await User.findById(req.params.id).select("-password");

    if (user.role === roles.CLIENT || user.isBlocked || target.email === process.env.ADMIN_EMAIL1 || target.email === process.env.ADMIN_EMAIL2) {
      return res.status(401).send({ success: false, message: "You are not allowed to do so!!", from: "Not admin or Blocked or traget is ADMIN" });
    }

    const result = await User.updateOne({ _id: req.params.id }, { $set: { "isBlocked": !target.isBlocked } });
    const updatedStatus = await User.findById(req.params.id).select("isBlocked");
    res.json({ success: true, result: result, newStatus: updatedStatus });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message, from: "blockAUser | Catch Section" });
  }
});

module.exports = router;