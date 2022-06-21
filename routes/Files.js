const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fs = require("fs");
const multer = require("multer");

const {fetchuser, isAdmin} = require('../middlewares/fetchuser');
const Attendance = require('../models/Attendance');

require('dotenv').config();


// Router- 1 ADD an Item using POST:'/api/file/uploadFile' | login required**********
// ***multer function for middleware***
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/excelSheets");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + file.originalname)
  }
})
// ***multer middleware***
const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 5 } });

// Router - 1 ADD and Item ******* | Login required
router.post('/uploadFile',
  fetchuser,
  upload.single('attendanceFile'),
  [
    // validation rules for input
    body('department', 'Enter a valid department name').isLength({ min: 2 }),
    body('semester', 'Enter a valid semester').isLength({ min: 2 }),
    body('subject', 'Enter a valid subject').isLength({ min: 2 }),
    body('course', 'Enter a valid course').isLength({ min: 2 }),
    body('subjectCode', 'Enter a valid subjectCode').isLength({ min: 4 })
  ],
  async (req, res) => {
    try {
      //check for validaion errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            return res.status(501).json({ success: false,  message: err, from: "delete a just stored file when textfield is not valid" });
          }
        })
        return res.status(502).json({ success: false,  message: errors.array(), from: "Some errors in creds validation" });
      }

      // fetch the image file name after execution of multer middleware
      const fileName = req.file.filename;

      // create an new item using Item model
      const item = new Attendance({
        userId: req.user_id,
        fileName: fileName,
        department: req.body.department,
        semester: req.body.semester,
        subject: req.body.subject,
        course: req.body.course,
        subjectCode: req.body.subjectCode
      });
      // Now save the item to mongodb
      const savedItem = await item.save();

      res.send({ success: true, savedItem:savedItem });
    } catch (error) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          return res.status(501).json({ success: false,  message: err, from: "Trying to delete the file in Catch section of upload File" });
        }
      })
      return res.status(503).send({ success: false, message: error.message, from: "upload attendance file | Catch section" });
    }
  });


// Router 2) - fetch all Items of a user using GET:'/api/file/fetchFiles' | login required
router.get('/fetchFiles',
  fetchuser, 
  async (req, res) => {
    try {
      // fetch all items of current user from DB with the help of user_id
      const user_id = req.user_id;
      let file_list = await Attendance.find({ userId: user_id });
      res.json({success:true, file_list:file_list});
    } catch (error) {
      res.status(500).send({success:false, message: error.message, from:"fetchItems of A User | Catch Section" });
    }
  });


// Router 3: Delete an existing Item using:DELETE   '/api/file/deleteItem:id'   Login required;
router.delete('/deleteItem/:id', fetchuser, async (req, res) => {
  try {
    // checking whether item exist or not, If find then delete
    let item = await Attendance.findById(req.params.id);
    if (!item) {
      return res.status(400).send({ success: false, message: "Item not found that you want to delete" });
    }

    // checking whether user owns this item or not
    if (item.userId.toString() !== req.user_id) {
      return res.status(401).send({ success: false, message: "sorry!! You are not allowed to delete this item" });
    }
    // Finaly deleting File**
    fs.unlink(`./public/excelSheets/${item.fileName}`, (err) => {
      if (err.errno!==-4058) {
        return res.status(501).json({ success: false, from: "sorry! Not able to delete the File", message: err });
      }
    })
    // finaly Deleting item**
    item = await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Item deleted successfully", item: item });
  } catch (error) {
    res.status(402).send({ success: false, message: error.message, from: "Delete Item | catch Section" });
  }
})

// Router 4: Merge a ecxel Sheet with Existing One | 'api/file/mergeSheet:id' | Login Required

// Router:5 fetch Particular Items | 'api/file/fetchAItem:' | Login required



// ********* ADMIN AREA *********

// Router 1: getAllItems || Access to ADMIN Only || Login required
router.get('/getAllItems', fetchuser, isAdmin, async (req, res)=>{
  try{
    const allitems=await Attendance.find();
    res.send({success:true, allitems:allitems});
  }catch (error) {
    console.error(error.message);
    res.status(402).send({ success: false, message: error.message, from: "getAllItems" });
  }
})

module.exports = router;