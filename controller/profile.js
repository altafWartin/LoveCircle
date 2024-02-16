const User = require("../models/profile/user");
const LikeDislikeRequested = require("../models/profile/like_dislike_requested");
const LikeDislikeStatus = require("../models/profile/like_dislike_status");
var crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { uploadFile, deleteFile } = require("../s3");
const ChatRoom = require("../models/chat/chatroom");
const Chat = require("../models/chat/chatMessages");
const { getMessaging } = require("firebase-admin/messaging")

exports.getProfile = async (req, res) => {
  var { gender } = req.body;
  // console.log(profileID);

  var profile = await User.find({ gender: gender })
    .populate(
      "basic_Info",
      "sun_sign cuisine political_views looking_for personality first_date drink smoke religion fav_pastime"
    )
    .select("name images height live dob gender")
    .limit(20);

  if (profile) {
    // var age = getAge(profile.dob);
    return res.json({ profile });
  } else {
    return res.status(400).json({ failed: true, profile });
  }
};

exports.LikedOrNotProfile = async (req, res) => {
  var { userID, likedID, status } = req.body;
  var likeDislikeProfile = new LikeDislikeRequested({
    userID,
    likedID,
    status,
  });
  if (status == 0) {
    //then send Notification
    var user = await User.findOne({ _id: likedID });
    const receivedToken = user.device_tokens;
    for (let i = 0; i < receivedToken.length; i++) {
      const message = {
        notification: {
          title: "Hey! Good Newzz",
          body: "Someone recently Liked your profile. if you like their profile then you can start chatting",
          // imageUrl: 'https://media.istockphoto.com/id/178640157/photo/halloween-monster.jpg?s=612x612&w=0&k=20&c=8bXRPczSeB9Vmi4sZHHRUUO7wgfDpwEkniuO-_puhRs=',
        },
        android: {
          notification: {
            icon: 'launcher_icon',
            color: '#7e55c3',
            default_sound: true,
            priority: "high",
          }
        },
        data: {
          context: "likes"
        },
        token: receivedToken[i],
      };

      getMessaging()
        .send(message)
        .then((response) => {
          // res.status(200).json({
          //   message: "Successfully sent message",
          //   token: receivedToken,
          // });
          console.log("Successfully sent message:", response);
        })
        .catch(async (error) => {
          // remove deleted token
          await User.findOneAndUpdate(
            { _id: likedID },
            { $pull: { device_tokens: receivedToken[i] } }
          );
          // console.log("remove :- " + receivedToken[i]);
          // res.status(400);
          // res.send(error);
          console.log("Error sending message:", error);
        });
    }
  }
  var profileExists = await LikeDislikeRequested.findOne({ $and: [{ userID: userID }, { likedID: likedID }] })
  if (profileExists == null) {
    likeDislikeProfile.save().then((profile) => {
      return res.json(profile);
    });
  } else {
    return res.json(profileExists);
  }
};

exports.getLikedDislikeProfile = async (req, res) => {
  var { userID, status } = req.body;
  var likedDislikeProfile = await LikeDislikeRequested.find({
    likedID: userID,
    status: status,
  }).populate({
    path: "likedID",
    select: { name: 1, images: 1, dob: 1 },
    // populate: {
    //   path: "basic_Info",
    //   model: "Basic_Info",
    //   select: {
    //     sun_sign: 1,
    //     cuisine: 1,
    //     political_views: 1,
    //     looking_for: 1,
    //     personality: 1,
    //     first_date: 1,
    //     drink: 1,
    //     smoke: 1,
    //     religion: 1,
    //     fav_pastime: 1,
    //   },
    // },
  });
  if (likedDislikeProfile) {
    return res.json({ likedDislikeProfile });
  }
};

// function decodeBase64Image(dataString) {
//   var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
//   var response = {};

//   if (matches.length !== 3) {
//     return new Error("Invalid input string");
//   }

//   response.type = matches[1];
//   response.data = new Buffer.from(matches[2], "base64");

//   return response;
// }

function decodeBase64Image(dataString) {
  // Use a regular expression to match the expected format of a data URI for base64-encoded images
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  // Create an empty object to store the response
  var response = {};

  // Check if the regular expression produced a match with three components
  if (matches && matches.length === 3) {
    // If the match is successful, extract the image type and decode the base64 data
    response.type = matches[1];
    response.data = Buffer.from(matches[2], "base64");
  } else {
    // If the match is not successful, return an error indicating an invalid input string
    return new Error("Invalid input string");
  }

  // Return the response object, containing the image type and decoded data
  return response;
}




async function uploadImageToAWS(photo, id, index) {
  // Generate random string
  var seed = crypto.randomBytes(20);
  var uniqueSHA1String = crypto.createHash("sha1").update(seed).digest("hex");
  var base64Data = photo;

  //decode image
  var imageBuffer = decodeBase64Image(base64Data);

  //Create URL
  var uniqueRandomImageName = "date-madly-" + uniqueSHA1String;
  var imageTypeRegularExpression = /\/(.*?)$/;
  var imageTypeDetected = imageBuffer.type.match(imageTypeRegularExpression);
  const url = uniqueRandomImageName + "." + imageTypeDetected[1];

  // Upload Image to AWS S3
  await uploadFile(base64Data, url);
  // Save to DB
  var push = index != 'single' ? { $push: { images: { $each: [url], $position: index } } } : { $push: { images: [url] } }
  var user = await User.findOneAndUpdate(
    { _id: id },
    push,
    { new: true }
  );
  return user;
}

exports.uploadImage = async (req, res) => {
  var { id, photo } = req.body;

  try {
    const user = await uploadImageToAWS(photo, id, 'single');
    if (user) {
      // return res.json({ user });
      var profile = await User.find({ _id: id }).select("images");
      return res.json({ profile });
    } else {
      return res.json("findOneandUpdate not working");
    }
  } catch (error) {
    console.log("ERROR:", error);
  }
};

exports.replaceImage = async (req, res) => {
  var { id, oldPhotoURL, newPhoto, index } = req.body;

  // delete old pic from DB
  // delete image from AWS
  // upload new image to AWS and update in server
  console.log(index);
  var user = await User.findOneAndUpdate(
    { _id: id },
    { $pull: { images: oldPhotoURL } },
    { new: true }
  );
  // old image deleted from DB
  if (user) {
    try {
      await deleteFile(oldPhotoURL);
      // upload new image to AWS and update in server
      const user = await uploadImageToAWS(newPhoto, id, index);
      if (user) {
        // return res.json({ user });
        var profile = await User.find({ _id: id }).select("images");
        return res.json({ profile });
      }
    } catch (error) {
      console.log("ERROR:", error);
    }
  }
};

exports.getSingleProfile = async (req, res) => {
  var { _id } = req.body;
  var profile = await User.find({ _id: _id })
    .populate(
      "basic_Info",
      "sun_sign cuisine political_views looking_for personality first_date drink smoke religion fav_pastime"
    )
    .select(
      "name images height live dob email designation income degree company email phoneNo"
    );
  if (profile) {
    return res.json({ profile });
  } else {
    return res.status(400).json({ failed: true, profile });
  }
};

exports.updateRequestStatus = async (req, res) => {
  var { userID, likedID, status } = req.body;
  var likeDislikeProfile = new LikeDislikeStatus({ userID, likedID, status });
  likeDislikeProfile.save().then(async (profile) => {
    if (status === 1) {
      // declined and delete from Like_Dislike_Requested
      var value = await LikeDislikeRequested.deleteOne({
        userID: userID,
        likedID: likedID,
      });
      console.log(value);
      return res.json(profile);
    } else {
      //accepted then create chatroom and delete from Like_Dislike_Requested
      var participants = [userID, likedID];
      console.log(participants);
      var findChatRoom = await ChatRoom.find({ participants: participants });
      console.log("find " + findChatRoom.toString());
      if (findChatRoom != "") {
        console.log("chatroom exists" + findChatRoom);
        return res.json(profile);
      } else {
        var chatroomID = uuidv4();
        var lastMessage = "Hey I liked your profile too...";

        var chatRoom = new ChatRoom({
          chatroomID,
          participants,
          lastMessage,
        });

        chatRoom
          .save()
          .then((chat) => {
            // create Message to chat
            status = "SENT";
            var senderID = userID;
            var recieveID = likedID;
            var msg = lastMessage;
            var messageID = chatroomID;
            var chatroomID = chat._id;
            var chat = new Chat({
              senderID,
              msg,
              messageID,
              chatroomID,
              status,
              recieveID,
            });
            chat.save().then(async (chat) => {
              await LikeDislikeRequested.deleteOne({
                userID: userID,
                likedID: likedID,
              });
              return res.json(profile);
            });
          })
          .catch((err) => {
            return res.status(400).json({ error: err });
          });
      }
    }
  });
};

exports.updateUserFields = async (req, res) => {
  var { designation, company, income, _id, degree } = req.body;

  const filter = { _id: _id };
  var update;

  if (designation) {
    console.log(designation);
    update = { designation: designation };
  }
  if (income) {
    update = { company: company, income: income };
  }
  if (degree) {
    update = { degree: degree };
  }

  let user = await User.findOneAndUpdate(filter, update, { new: true });

  return res.json({ user });
};

// function getAge(DOB) {
//   var today = new Date();
//   var birthDate = new Date(DOB);
//   var age = today.getFullYear() - birthDate.getFullYear();
//   var m = today.getMonth() - birthDate.getMonth();
//   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
//     age = age - 1;
//   }
//   return age;
// }
