const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  user:{ 
    type: Schema.Types.ObjectId, 
    ref: 'user'
  },
  fileName: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  semester: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  course:{
    type:String,
    required:true
  },
  subjectCode: {
    type: String,
    required: true,
  }
});

const Attendance = mongoose.model("attendance", fileSchema);

module.exports = Attendance;

/// mongodb://127.0.0.1:27017
