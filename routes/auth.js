const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const crypto = require("crypto");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Token = require('../models/Token');
const { fetchuser, isAdmin } = require('../middlewares/fetchuser')
const { roles } = require('../Roles');
const sendEmail = require('../verification/Email');

require('dotenv').config();
const JWT_secret = process.env.JWT_SECRET_KEY;

// ************ USER AREA ************

// Router -1.1 '/api/auth/createuser'
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

      // **** Saving Token for email verification purpose ****
      let token = await new Token({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();

      const v_link = `${process.env.BASE_URL}/verify/${user.id}/${token.token}`;
      sendEmail(v_link, email);

      // returning user id in Token
      const data = { user: { id: user.id } };
      const auth_token = jwt.sign(data, JWT_secret);
      res.json({ success: true, auth_token: auth_token });
    } catch (error) {
      res.status(500).send({ success: false, message: error.message, from: "Create User | Catch Section" });
    }
  })
// Router -1.2 For Email verification***********
router.get("/verify/:id/:token", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id });
    if (!user) return res.status(400).send({ success: false, message: "Invalid link" });

    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });
    if (!token) return res.status(401).send({ success: false, message: "Invalid link" });

    await User.updateOne({ _id: req.params.id }, { $set: { verified: true } });
    await Token.findByIdAndRemove(token._id);

    res.send({ success: true, message: "email verified sucessfully" });
  } catch (error) {
    res.status(400).send({ success: false, message: error.message, from: "Verify Email | Catch Section" });
  }
});


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

      if (user.isBlocked || !user.verified) {
        return res.status(401).json({ success: false, message: "Sorry You are Either Blocked by admin or Your email is not verified", from: "You are Blocked | email not verified" });
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
    if (!uploader) {
      return res.status(401).send({ success: false, message: "User not Find with this Id!!!", from: "get User By Id" });
    }
    res.send({ success: true, uploader: uploader });
  } catch (error) {
    res.status(509).json({ success: false, message: error.message, from: "Catch Section" });
  }
})


// ************ ADMIN AREA ************

// Router:1 - fetch All user | ADMIN access only
router.get('/getAllUsers', fetchuser, isAdmin, async (req, res) => {
  try {
    const allusers = await User.find();
    res.send({ success: true, allusers: allusers });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message, from: "getAllUsers | Catch Section" });
  }
});


// Route:2 - Block a User | ADMIN Access Only
router.put('/blockAUser/:id', fetchuser, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user_id).select("-password");
    let target = await User.findById(req.params.id).select("-password");

    if (target.email === process.env.ADMIN_EMAIL1 || target.email === process.env.ADMIN_EMAIL2) {
      return res.status(401).send({ success: false, message: "You are not allowed to do so!!", from: "traget is ADMIN" });
    }

    const result = await User.updateOne({ _id: req.params.id }, { $set: { "isBlocked": !target.isBlocked } });
    const updatedStatus = await User.findById(req.params.id).select("isBlocked");
    res.json({ success: true, result: result, newStatus: updatedStatus });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message, from: "blockAUser | Catch Section" });
  }
});


module.exports = router;