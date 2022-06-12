const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_secret = process.env.JWT_SECRET_KEY;

const fetchuser=(req, res, next)=>{
  const auth_token=req.header('auth_token');
  if(!auth_token){
    res.status(401).json({success:false, message:"You do not have a auth token", from:"from Fetchuser Middleware"});
    return;
  }
  try {
    const user_data=jwt.verify(auth_token, JWT_secret);
    req.user_id=user_data.user.id; // this is user id we have at the time of generating web token
    next();
  } catch (error) {
    res.status(500).json({success:false, message:error.message, from:"from Fetchuser Catch Section"});
  }
}

module.exports=fetchuser;