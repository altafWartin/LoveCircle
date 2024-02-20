const express = require("express");
const { requireSignin, checkError, decodeToken } = require("../controller/user");
const { getProfile, LikedOrNotProfile, getLikedDislikeProfile, uploadImage, replaceImage, getSingleProfile, updateRequestStatus, updateUserFields } = require("../controller/profile");
const router = express.Router();
const multer = require('multer');
const AWS = require('aws-sdk');


// Set up Multer to handle file uploads
const storage = multer.memoryStorage(); // Use memory storage for storing file buffers
const upload = multer({ storage: storage });


router.post("/getProfile", requireSignin, checkError,  getProfile);
router.post("/addLikeDislikeProfile", LikedOrNotProfile);
// router.post("/getLikedDislikeProfile", requireSignin, checkError, decodeToken, getLikedDislikeProfile);
router.post("/getLikedDislikeProfile", getLikedDislikeProfile);
router.post("/uploadImage", upload.single('photo'), uploadImage);

router.post("/replaceImage", upload.single('newPhoto'), replaceImage);
router.post("/getSingleProfile", getSingleProfile);
router.post("/updateRequestStatus",  updateRequestStatus)
// router.post("/updateRequestStatus", requireSignin, checkError, decodeToken, updateRequestStatus)
router.post("/updateUserFields", updateUserFields)   

module.exports = router;

