const express = require("express");
const {
  loginUser,
  getAllUsers,
  createUser,
  userExists,
  refreshToken,
  updateAdditionalDetails,
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const router = express.Router();

router.post("/loginUser", loginUser);
router.post("/getAllUsers", getAllUsers, decodeToken,requireSignin);
router.post("/createUser", createUser);
router.post("/userExists", userExists);
router.post("/refreshToken", refreshToken);
router.post("/updateAdditionalDetails", updateAdditionalDetails);
// router.post("/secret", requireSignin, checkError, decodeToken, (req, res)=>{
//   return res.status(200).send(req.user);
// });

module.exports = router;
