const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenSchema = new mongoose.Schema({
  userId:{ 
    type: Schema.Types.ObjectId, 
    ref: 'user',
    required:true
  },
  token: {
    type: String,
    required: true,
  },
  date:{
    type:Date,
    default:Date.now()
  }
});

const Token = mongoose.model("token", tokenSchema );

module.exports = Token;