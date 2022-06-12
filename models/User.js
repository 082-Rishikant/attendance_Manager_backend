const mongoose = require("mongoose");
const {roles}=require('../Roles');

const FriendSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique:true
  },
  institute: {
    type: String,
    required: true,
  },
  department:{
    type:String,
    required:true
  },
  password: {
    type: String,
    required: true,
  },
  role:{
    type:String,
    default:roles.CLIENT
  },
  isBlocked:{
    type:Boolean,
    default:false
  },
  verified:{
    type:Boolean,
    default:false
  },
  date:{
    type:Date,
    default:Date.now()
  }
});

const FriendModel = mongoose.model("user", FriendSchema);

module.exports = FriendModel;

/// mongodb://127.0.0.1:27017
