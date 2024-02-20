const express = require("express");
const {
  createChatRoom,
  getAllChatRoom,
  getSingleChat,
  sendSingleChat,
  updateMessageStatus,
} = require("../controller/chat");
const {
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const router = express.Router();

router.post("/createChatRoom", createChatRoom);
router.post("/getAllChatRoom", getAllChatRoom ,decodeToken,requireSignin ,checkError);

router.post(
  "/getSingleChat",
  requireSignin,
  checkError,
  decodeToken,
  getSingleChat
);
router.post(
  "/sendSingleChat",
  requireSignin,
  checkError,
  decodeToken,
  sendSingleChat
);
router.post(
  "/updateMessageStatus",
  requireSignin,
  checkError,
  decodeToken,
  updateMessageStatus
);

module.exports = router;
