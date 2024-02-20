const User = require("../models/profile/user");
const LikeDislikeRequested = require("../models/profile/like_dislike_requested");
const LikeDislikeStatus = require("../models/profile/like_dislike_status");
var crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const { uploadFile, deleteFile } = require("../s3");
const ChatRoom = require("../models/chat/chatroom");
const Chat = require("../models/chat/chatMessages");
const { getMessaging } = require("firebase-admin/messaging");

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
            icon: "launcher_icon",
            color: "#7e55c3",
            default_sound: true,
            priority: "high",
          },
        },
        data: {
          context: "likes",
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
  var profileExists = await LikeDislikeRequested.findOne({
    $and: [{ userID: userID }, { likedID: likedID }],
  });
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

const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEYS,
  secretAccessKey: process.env.AWS_SECRET_KEYS,
  region: process.env.AWS_BUCKET_REGION,
});

// exports.uploadImage = async (req, res) => {
//   try {
//     const { id } = req.body;
//     const photo = req.file;

//     console.log("Received image upload request for user:", id, photo);

//     if (!id) {
//       console.log("id is not provided");
//       return res.json("id is not provided");
//     }

//     if (!photo || !photo.buffer) {
//       console.log("Photo data is not provided");
//       return res.json("Photo data is not provided");
//     }

//     const params = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `images/${id}_${Date.now()}_${photo.originalname}`,
//       Body: photo.buffer,
//     };

//     const uploadResult = await s3.upload(params).promise();
//     console.log("Image uploaded to AWS S3:", uploadResult);

//     // Update the user's document with the image URL
//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       { $push: { images: uploadResult.Location } }, // Assuming 'images' is an array field in your User model
//       { new: true }
//     );

//     if (updatedUser) {
//       console.log("User profile updated:", updatedUser);
//       return res.json({
//         message: 'Image uploaded and user profile updated successfully',
//         imageUrl: uploadResult.Location,
//         profile: updatedUser,
//       });
//     } else {
//       console.log("findOneAndUpdate not working");
//       return res.json("findOneAndUpdate not working");
//     }
//   } catch (error) {
//     console.error("Error uploading image:", error);
//     return res.status(500).json("Internal Server Error");
//   }
// };

exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.body;
    const photo = req.file;

    console.log("Received image upload request for user:", id, photo);

    if (!id) {
      console.log("id is not provided");
      return res.status(400).json({ error: "id is not provided" });
    }

    if (!photo || !photo.buffer) {
      console.log("Photo data is not provided");
      return res.status(400).json({ error: "Photo data is not provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${id}_${Date.now()}_${photo.originalname}`,
      Body: photo.buffer,
    };

    try {
      // Attempt S3 upload
      const uploadResult = await s3.upload(params).promise();
      console.log("Image uploaded to AWS S3:", uploadResult);

      // Attempt to update the user's document with the image URL
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $push: { images: uploadResult.Location } },
        { new: true }
      );

      if (updatedUser) {
        console.log("User profile updated:", updatedUser);
        return res.json({
          message: "Image uploaded and user profile updated successfully",
          imageUrl: uploadResult.Location,
          profile: updatedUser,
        });
      } else {
        console.log("findOneAndUpdate not working");
        return res.status(500).json({ error: "findOneAndUpdate not working" });
      }
    } catch (uploadError) {
      console.error("Error uploading image to AWS S3:", uploadError);
      return res.status(500).json({ error: "Error uploading image to AWS S3" });
    }
  } catch (error) {
    console.error("Error processing image upload request:", error);
    return res.status(500).json("Internal Server Error");
  }
};



AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION,
});




// Function to check if a string is a valid URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}



exports.replaceImage = async (req, res) => {
  try {
    const { id, oldPhotoURL, index } = req.body;
    const newPhoto = req.file;

    console.log("Received replaceImage request:", { id, oldPhotoURL, newPhoto, index });

    if (!id || !isValidUrl(oldPhotoURL) || isNaN(index)) {
      console.log("Invalid request parameters");
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    console.log("Finding and updating user document in the database");
    const user = await User.findOneAndUpdate(
      { _id: id },
      { $pull: { images: oldPhotoURL } },
      { new: true }
    );

    if (user) {
      console.log("User document updated successfully:", user);

      try {
        console.log("Deleting old image file from storage (if needed)");

        // Add any logic here if you need to delete the old image file from your storage system

        console.log("Uploading new image to AWS S3 and updating the server");

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `images/${id}_${Date.now()}_${newPhoto.originalname}`,
          Body: newPhoto.buffer,
        };

        try {
          // Attempt S3 upload
          const uploadResult = await s3.upload(params).promise();
          console.log("Image uploaded to AWS S3:", uploadResult);

          // Attempt to update the user's document with the image URL
          const updatedUser = await User.findByIdAndUpdate(
            id,
            { $push: { images: uploadResult.Location } },
            { new: true }
          );

          if (updatedUser) {
            console.log("User profile updated:", updatedUser);
            return res.json({
              message: "Image uploaded and user profile updated successfully",
              imageUrl: uploadResult.Location,
              profile: updatedUser,
            });
          } else {
            console.log("findOneAndUpdate not working");
            return res.status(500).json({ error: "findOneAndUpdate not working" });
          }
        } catch (uploadError) {
          console.error("Error uploading image to AWS S3:", uploadError);
          return res.status(500).json({ error: "Error uploading image to AWS S3" });
        }
      } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      console.log("Error: User not found or error updating user document");
      return res.status(500).json({ error: "Error removing old image from DB" });
    }
  } catch (error) {
    console.error("Error processing image replace request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
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

// exports.updateUserFields = async (req, res) => {
//   var { designation, company, income, _id, degree } = req.body;

//   const filter = { _id: _id };
//   var update;

//   if (designation) {
//     console.log(designation);
//     update = { designation: designation };
//   }
//   if (income) {
//     update = { company: company, income: income };
//   }
//   if (degree) {
//     update = { degree: degree };
//   }

//   let user = await User.findOneAndUpdate(filter, update, { new: true });

//   return res.json({ user });
// };

exports.updateUserFields = async (req, res) => {
  const {
    name,
    designation,
    company,
    income,
    _id,
    degree,
    gender,
    dob,
    location,
    job,
    college,
    about,
  } = req.body;

  const filter = { _id: _id };
  const update = {};

  if (designation) {
    update.designation = designation;
  }
  if (company) {
    update.company = company;
  }
  if (income) {
    update.income = income;
  }
  if (degree) {
    update.degree = degree;
  }
  if (gender) {
    update.gender = gender;
  }
  if (dob) {
    update.dob = dob;
  }
  if (location) {
    update.location = location;
  }
  if (job) {
    update.job = job;
  }
  if (college) {
    update.college = college;
  }
  if (about) {
    update.about = about;
  }

  if (name) {
    update.name = name;
  }

  try {
    const user = await User.findOneAndUpdate(filter, update, { new: true });
    return res.json({ user });
  } catch (error) {
    // Handle error appropriately
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
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
