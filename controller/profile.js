const User = require("../models/profile/user");
const LikeDislikeRequested = require("../models/profile/like_dislike_requested");
const LikeDislikeStatus = require("../models/profile/like_dislike_status");

const Notification = require("../models/profile/Notification");

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



exports.getFilterProfile = async (req, res) => {
  try {
    const { gender,
      location, distance, minAge, maxAge
    } = req.body;

    let query = {};

    if (gender) {
      query.gender = gender;
    }

    if (location && distance) {
      const [longitude, latitude] = location.split(",").map(parseFloat);

      query.loc = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: parseFloat(distance) * 1000,
        },
      };
    }

    if (minAge || maxAge) {
      query.dob = {};

      if (minAge) {
        const minBirthYear = new Date().getFullYear() - parseInt(minAge, 10);
        query.dob.$gte = new Date(`${minBirthYear}-01-01T00:00:00.000Z`);
      }

      if (maxAge) {
        const maxBirthYear = new Date().getFullYear() - parseInt(maxAge, 10);
        query.dob.$lte = new Date(`${maxBirthYear}-12-31T23:59:59.999Z`);
      }
    }

    const filteredUsers = await User.find(query);

    // res.json({ data: filteredUsers });
    return res.json({ users : filteredUsers });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// LikedOrNotProfile route handler
exports.LikedOrNotProfile = async (req, res) => {
  try {
    // Destructure request body
    const { userID, likedID, status } = req.body;

    // Create a new instance of LikeDislikeRequested model
    const likeDislikeProfile = new LikeDislikeRequested({
      userID,
      likedID,
      status,
    });

    console.log(status, "status");

    // Check if the profile already exists
    const profileExists = await LikeDislikeRequested.findOne({
      $and: [{ userID: userID }, { likedID: likedID }],
    });

    if (profileExists === null) {
      if (status === 0) {
        // Send Notification
        console.log(status);

        // Query for the user with likedID
        const user = await User.findOne({ _id: likedID });

        // Check if the user exists
        if (user) {
          // Create a new notification for the user whose profile was liked
          const newNotification = new Notification({
            userId: likedID,
            title: "Hey! Good News",
            body: `${userID} recently liked your profile. If you like their profile, you can start chatting.`,
          });

          // Save the notification to the database
          await newNotification.save();

          return res.status(201).json({ Notification: newNotification });
        } else {
          return res.status(404).json({ error: "Liked user not found" });
        }
      }

      // Save the new profile
      const savedProfile = await likeDislikeProfile.save();
      console.log("Profile Saved:", savedProfile);
      return res.status(201).json(savedProfile);
    } else {
      console.log("Profile Already Exists:", profileExists);
      return res.status(200).json(profileExists);
    }
  } catch (error) {
    console.error("Error processing LikedOrNotProfile:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
// Define the API endpoint function
exports.getLikedDislikeProfile = async (req, res) => {
  const { userID, status } = req.body;

  try {
    const likedProfiles = await LikeDislikeRequested.find({
      likedID: userID,
      status: status,
    }).populate({
      path: "userID",
      select: { name: 1, images: 1, dob: 1, device_tokens: 1 }, // Include device tokens for push notification
    });

    // Send push notification for each like
    likedProfiles.forEach(async (like) => {
      const { name, device_tokens } = like.userID;

      const message = {
        notification: {
          title: "New Like",
          body: `${name} liked your profile.`,
        },
        tokens: device_tokens, // Array of device tokens
      };

      try {
        const response = await getMessaging().sendMulticast(message);
        console.log("Successfully sent message:", response);
      } catch (error) {
        console.error("Error sending like notification:", error);
      }
    });

    return res.json({ likedProfiles });
  } catch (error) {
    console.error("Error retrieving liked profiles:", error);
    return res.status(500).json({ error: "Internal Server Error" });
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

// controller/profile.js (or wherever you retrieve notifications)
exports.GetNotifications = async (req, res) => {
  const { userId } = req.body;

  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: "desc" })
      // .populate('commenterId', 'name') // Populate commenterId with 'name' field
      .exec();

    return res.json({ notifications });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// controller/profile.js
const Comment = require("../models/profile/comment"); // Adjust the path accordingly

// ... other imports ...

exports.AddComment = async (req, res) => {
  const { userId, commenterId, imageUrl, text } = req.body;

  try {
    const newComment = new Comment({
      userId,
      commenterId,
      imageUrl,
      text,
    });

    const savedComment = await newComment.save();

    // Create a new notification for the user whose image received a comment
    const newNotification = new Notification({
      userId,
      commenterId,
      imageUrl,
      title: "New Comment",
      body: `some one commented on your image: ${text}`,
    });

    await newNotification.save(); // Save the notification to the database

    return res.json({ comment: savedComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.GetComment = async (req, res) => {
  const { userId, imageUrl } = req.body;

  try {
    const comments = await Comment.find({ userId, imageUrl }).sort({
      createdAt: "desc",
    });

    return res.json({ comments });
  } catch (error) {
    console.error("Error retrieving comments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.replaceImage = async (req, res) => {
  try {
    const { id, oldPhotoURL, index = 1 } = req.body;
    const newPhoto = req.file;

    console.log("Received replaceImage request:", {
      id,
      oldPhotoURL,
      newPhoto,
      index,
    });

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
            return res
              .status(500)
              .json({ error: "findOneAndUpdate not working" });
          }
        } catch (uploadError) {
          console.error("Error uploading image to AWS S3:", uploadError);
          return res
            .status(500)
            .json({ error: "Error uploading image to AWS S3" });
        }
      } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      console.log("Error: User not found or error updating user document");
      return res
        .status(500)
        .json({ error: "Error removing old image from DB" });
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
    .select("name email password  images profilePhoto profileScore phoneNo gender loc dob height live belongTo relationStatus degree institute designation gender dob company location job college about income  basic_Info")

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

// exports.updateUserFields = async (req, res) => {
//   const {
//     name,
//     designation,
//     company,
//     income,
//     _id,
//     degree,
//     gender,
//     dob,
//     location,
//     job,
//     college,
//     about,
//   } = req.body;

//   const filter = { _id: _id };
//   const update = {};

//   if (designation) {
//     update.designation = designation;
//   }
//   if (company) {
//     update.company = company;
//   }
//   if (income) {
//     update.income = income;
//   }
//   if (degree) {
//     update.degree = degree;
//   }
//   if (gender) {
//     update.gender = gender;
//   }
//   if (dob) {
//     update.dob = dob;
//   }
//   if (location) {
//     update.location = location;
//   }
//   if (job) {
//     update.job = job;
//   }
//   if (college) {
//     update.college = college;
//   }
//   if (about) {
//     update.about = about;
//   }

//   if (name) {
//     update.name = name;
//   }

//   try {
//     const user = await User.findOneAndUpdate(filter, update, { new: true });
//     return res.json({ user });
//   } catch (error) {
//     // Handle error appropriately
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

exports.updateUserFields = async (req, res) => {
  const {
    _id,
    name,
    dob,
    gender,
    location,
    job,
    company,
    college,
    about,
  } = req.body;

  // Update fields
  const update = {
    name,
    dob,
    gender,
    location,
    job,
    company,
    college,
    about,
    // Add a field to store the photo key in the user document
  };

  const filter = { _id: _id };

  try {
    // Update user in the database
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
