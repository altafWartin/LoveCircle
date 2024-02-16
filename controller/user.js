const User = require("../models/profile/user");
const BasicInfo = require("../models/profile/basic_info");
var { expressjwt } = require("express-jwt");
const jwt = require("jsonwebtoken");

exports.createUser = async (req, res) => {
  var {
    phoneNo,
    gender,
    password,
    name,
    dob,
    height,
    live,
    relationStatus,
    degree,
    designation,
    company,
    income,
    date,
    month,
    device_tokens,
    email,
    type,
  } = req.body;

console.log("Type:", type);


  // return res.json({ user });

  var oldUser;
  if (type === "phone") {
    oldUser = await User.findOne({ phoneNo: phoneNo });
  } else {
    oldUser = await User.findOne({ email: email });
  }
  if (oldUser) {
    const jwtToken = jwt.sign({ _id: oldUser._id }, process.env.JWT_SECRET, {
      expiresIn: "90 days",
    });
    var user = {
      name: "User Exists",
      device_tokens: [],
      images: [],
      describe: [],
      _id: oldUser._id,
    };
    return res.json({ user, jwtToken });
  }




  if (type === "phone") {
    console.log("Phone")
    var user = new User({
      phoneNo,
      gender,
      name,
password,
      dob,
      height,
      live,
      relationStatus,
      degree,
      designation,
      company,
      income,
      device_tokens,
      // email,
      // loc: {
      //   type: "Point",
      //   coordinates: [lat, long],
      // },
    })
    
  } else if (type === "email") {
    console.log("email")

    var user = new User({
      gender,
      password,
      name,
      dob,
      height,
      live,
      relationStatus,
      degree,
      designation,
      company,
      income,
      device_tokens,
      email,
      // loc: {
      //   type: "Point",
      //   coordinates: [lat, long],
      // },
    });

  }

  console.log("User before saving:", user);

 
  user.save()
    .then((data) => {
      console.log("User saved successfully:", data);

      // return res.json({ data });
      var user = data._id;
      // print(data)
      sun_sign = zodiac_sign(date, month);
      var basicInfo = new BasicInfo({
        user,
        sun_sign,
      });

      basicInfo
        .save()
        .then(async () => {
          var basic_Info = basicInfo._id;
          await User.findOneAndUpdate(
            { _id: user },
            { basic_Info: basic_Info }
          ).then(() => {
            user = data;
            const jwtToken = jwt.sign(
              { _id: user._id },
              process.env.JWT_SECRET,
              {
                expiresIn: process.env.JWT_EXPIRY,
              }
            );
            return res.json({ user, basicInfo, jwtToken });
          });
        })
        .catch((err) => {
          return res.status(400).json({ error: err });
        });
    })
    .catch((err) => {
      return res.status(400).json({ error: err });
    });
};

exports.loginUser = async (req, res) => {
  var { phoneNo, email, password, type } = req.body;

  console.log("Type:", type);

  var user;
  if (type === "phone") {
    console.log("Phone");
    user = await User.findOne({ phoneNo: phoneNo });

  } else if (type === "email") {
    console.log("Email");
    user = await User.findOne({ email: email });

  }

  if (!user && !user.comparePassword(password)) {
    // If user doesn't exist or password doesn't match
    return res.status(401).json({ error: "Invalid credentials" });  
  }


    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,

    })
    return res.json({ user, jwtToken })

};



exports.requireSignin = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  // userProperty: "auth",
});

exports.checkError = (err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    // console.log("Profile Called");
    return res.status(401).json("invalid token...");
  } else {
    console.log(err.name);
    next(err);
  }
};

exports.decodeToken = (req, res, next) => {
  var id = req.headers.authorization.split(" ")[1];
  var decoded = jwt.verify(id, process.env.JWT_SECRET);
  console.log(decoded);
  req.user = decoded;
  // console.log(decoded);
  next();
};

exports.refreshToken = (req, res) => {
  var { id } = req.body;
  const jwtToken = jwt.sign({ _id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
  return res.json({ jwtToken });
};

exports.userExists = async (req, res) => {
  var { phoneNo, device_tokens, email, name, type } = req.body;

  var user;
  if (type === "phone") {
    user = await User.findOne({ phoneNo: phoneNo });
  } else if (type === "email") {
    user = await User.findOne({ email: email });
  }

  // console.log(user);
  // if user exists then add fcm token to here.

  if (user) {
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });
    var token = await User.findOne({
      device_tokens: { $in: [device_tokens] },
    });
    if (!token) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { $push: { device_tokens: device_tokens } }
      );
    }
    var user = {
      name: "User Exists",
      device_tokens: token != null ? [device_tokens] : [],
      images: [],
      describe: [],
      _id: user._id,
      gender: user.gender,
      jwtToken,
    };
    return res.json({ user });
  } else {
    var user = {
      name: "User Not Exists",
      device_tokens: [],
      images: [],
      describe: [],
    };
    return res.json({ user });
  }
};

//aa
// exports.updateAdditionalDetails = async (req, res) => {
//   try {
//     var {
//       cuisine,
//       sun_sign,
//       political_views,
//       looking_for,
//       personality,
//       first_date,
//       drink,
//       smoke,
//       religion,
//       fav_pastime,
//       _id,
//     } = req.body;

//     const filterUser = { _id: _id }; // Assuming user ID is used to filter the user
//     const filterBasicInfo = { user: _id };

//     let updateUser = {};
//     let updateBasicInfo = {};

//     if (sun_sign) {
//       updateBasicInfo.sun_sign = sun_sign;
//     }
//     if (cuisine) {
//       updateBasicInfo.cuisine = cuisine;
//     }
//     if (political_views) {
//       updateBasicInfo.political_views = political_views;
//     }
//     if (looking_for) {
//       updateBasicInfo.looking_for = looking_for;
//     }
//     if (personality) {
//       updateBasicInfo.personality = personality;
//     }
//     if (first_date) {
//       updateBasicInfo.first_date = first_date;
//     }
//     if (drink) {
//       updateBasicInfo.drink = drink;
//     }
//     if (smoke) {
//       updateBasicInfo.smoke = smoke;
//     }
//     if (religion) {
//       updateBasicInfo.religion = religion;
//     }
//     if (fav_pastime) {
//       updateBasicInfo.fav_pastime = fav_pastime;
//     }

//     let updatedBasicInfo = await BasicInfo.findOneAndUpdate(filterBasicInfo, updateBasicInfo, {
//       new: true,
//     });

//     // Update user if needed
//     let updatedUser = await User.findOneAndUpdate(filterUser, updateUser, {
//       new: true,
//     });

//     console.log("Updated User:", updatedUser);
//     console.log("Updated BasicInfo:", updatedBasicInfo);

//     return res.json({ user: updatedUser, basicInfo: updatedBasicInfo });
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };



exports.updateAdditionalDetails = async (req, res) => {
  var {
    cuisine,
    sun_sign,
    political_views,
    looking_for,
    personality,
    first_date,
    drink,
    smoke,
    religion,
    fav_pastime,
    _id,
  } = req.body;
  const filter = { user: _id };
  var update;
  if (sun_sign) {
    update = { sun_sign: sun_sign };
  }
  if (cuisine) {
    update = { cuisine: cuisine };
  }
  if (political_views) {
    update = { political_views: political_views };
  }
  if (looking_for) {
    update = { looking_for: looking_for };
  }
  if (personality) {
    update = { personality: personality };
  }
  if (first_date) {
    update = { first_date: first_date };
  }
  if (drink) {
    update = { drink: drink };
  }
  if (smoke) {
    update = { smoke: smoke };
  }
  if (religion) {
    update = { religion: religion };
  }
  if (fav_pastime) {
    update = { fav_pastime: fav_pastime };
  }

  let basicInfo = await BasicInfo.findOneAndUpdate(filter, update, {
    new: true,
  });

  return res.json(basicInfo);
};

let astro_sign = "";

function zodiac_sign(day, month) {
  if (month == "12") {
    if (day < 22) return (astro_sign = "Sagittarius");
    else return (astro_sign = "capricorn");
  } else if (month == "01") {
    if (day < 20) return (astro_sign = "Capricorn");
    else return (astro_sign = "aquarius");
  } else if (month == "02") {
    if (day < 19) return (astro_sign = "Aquarius");
    else return (astro_sign = "pisces");
  } else if (month == "03") {
    if (day < 21) return (astro_sign = "Pisces");
    else return (astro_sign = "aries");
  } else if (month == "04") {
    if (day < 20) return (astro_sign = "Aries");
    else return (astro_sign = "taurus");
  } else if (month == "05") {
    if (day < 21) return (astro_sign = "Taurus");
    else return (astro_sign = "gemini");
  } else if (month == "06") {
    if (day < 21) return (astro_sign = "Gemini");
    else return (astro_sign = "cancer");
  } else if (month == "07") {
    if (day < 23) return (astro_sign = "Cancer");
    else return (astro_sign = "leo");
  } else if (month == "08") {
    if (day < 23) return (astro_sign = "Leo");
    else return (astro_sign = "virgo");
  } else if (month == "09") {
    if (day < 23) return (astro_sign = "Virgo");
    else return (astro_sign = "libra");
  } else if (month == "10") {
    if (day < 23) return (astro_sign = "Libra");
    else return (astro_sign = "scorpio");
  } else if (month == "11") {
    if (day < 22) return (astro_sign = "scorpio");
    else return (astro_sign = "sagittarius");
  }
}
