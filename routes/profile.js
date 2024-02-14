const express = require("express");
const { requireSignin, checkError, decodeToken } = require("../controller/user");
const { getProfile, LikedOrNotProfile, getLikedDislikeProfile, uploadImage, replaceImage, getSingleProfile, updateRequestStatus, updateUserFields } = require("../controller/profile");
const router = express.Router();

router.post("/getProfile", requireSignin, checkError, decodeToken, getProfile);
router.post("/addLikeDislikeProfile", LikedOrNotProfile);
router.post("/getLikedDislikeProfile", requireSignin, checkError, decodeToken, getLikedDislikeProfile);
router.post("/uploadImage", uploadImage);
router.post("/replaceImage", replaceImage);
router.post("/getSingleProfile", getSingleProfile);
router.post("/updateRequestStatus", requireSignin, checkError, decodeToken, updateRequestStatus)
router.post("/updateUserFields", updateUserFields)

module.exports = router;
