const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { roles } = require('../Roles');

require('dotenv').config();
const JWT_secret = process.env.JWT_SECRET_KEY;

const fetchuser =async (req, res, next) => {
  try {
    const auth_token = req.header('auth_token');
    if (!auth_token) {
      return res.status(401).json({ success: false, message: "You do not have a auth token", from: "from Fetchuser Middleware" });
    }

    const user_data = jwt.verify(auth_token, JWT_secret);
    req.user_id = user_data.user.id; // this is user id we have at the time of generating web token

    const user=await User.findById(req.user_id).select("-password");
    if(!user){
      return res.status(401).send({ success: false, message: "User not Find!!!", from: "fetchUser middleware" });
    }
    if(user.isBlocked || !user.verified){
      return res.status(401).send({success:false, message:"You are either blocked or not Verified by Admin", from:"fetchUser"});
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, from: "from Fetchuser Catch Section" });
  }
}

const isAdmin = async (req, res, next) => {
  try {
    const user=await User.findById(req.user_id).select("-password");
    if(!user){
      return res.status(401).send({ success: false, message: "User not Find!!!", from: "fetchUser middleware" });
    }
    if (user.role!==roles.ADMIN) {
      return res.status(401).json({ success: false, message: "You are not Admin", from: "isAdmin | fetch User middleware" });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, from: "from Fetchuser Catch Section" });
  }
}

module.exports = { fetchuser, isAdmin };