require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const sls = require("serverless-http");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const http = require('http');  // Add this line to import the http module

const socketIO = require('socket.io');
const bodyParser = require('body-parser'); // Import body-parser middleware


const app = express();

// Use CORS middleware
// app.use(cors());
// Allow requests from http://localhost:3000
app.use(cors({ origin: 'http://localhost:3000' }));

// app.use(cors({ origin: '*' }));

const server = http.createServer(app);
const io = socketIO(server);

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Middleware to attach the io instance to the request object
app.use((req, res, next) => {
  req.io = io;
  next();
});




// for FCM
process.env.GOOGLE_APPLICATION_CREDENTIALS;

// // for FCM
// initializeApp({
//   credential: applicationDefault(),
//   projectId: process.env.FIREBASE_PROJECT_ID,
// });



mongoose
  .connect(process.env.DATABASE_CLOUD)
  .then((res) => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.log(error);
  });

app.use(express.json({ limit: "50mb" }));
// cors
if (process.env.NODE_ENV == "development") {
  app.use(cors({ origin: `${process.env.CLIENT_URL}` }));
}

const userRoutes = require("./routes/user");
const countriesRoutes = require("./routes/countries");
const profileRoutes = require("./routes/profile");
const chatRoutes = require("./routes/chat");

app.use("/api", userRoutes);
app.use("/api", countriesRoutes);
app.use("/api", profileRoutes);
app.use("/api", chatRoutes);
// app.use()

// const port = process.env.PORT || 8000;

// if (process.env.AWS_LAMBDA == "false") {
//   app.listen(port, () => {
//     console.log(`server is running on PORT ${port}`);
//   });
// }



// ... (other server configurations)

io.on('connection', (socket) => {
  // Handle Socket.IO events here
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
// const admin = require('firebase-admin');

// const serviceAccount = require('./lovecircle-b5c68-firebase-adminsdk-ui9y3-1b706666d7.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const port = process.env.PORT || 9000;
app.listen(port, () => {
  console.log(`Server is running on port chek  ${port}`);
});

app.get("/", async (req, res, next) => {
  res.status(200).send("Hello World!!!!!");
});

exports.handler = async (event) => {
  console.log(event);
  return 'Hello from Lambda!';
};


// if (process.env.AWS_LAMBDA == "true") module.exports.server = sls(app);
// aws-cli keys
// "",
// "",


// app.post("/send", function (req, res) {
//   const receivedToken = req.body.fcmToken;

//   const message = {
//     notification: {
//       title: "Hello",
//       body: "Someone has liked your profile",
//       imageUrl:
//         "https://media.istockphoto.com/id/178640157/photo/halloween-monster.jpg?s=612x612&w=0&k=20&c=8bXRPczSeB9Vmi4sZHHRUUO7wgfDpwEkniuO-_puhRs=",
//     },
//     android: {
//       notification: {
//         icon: "launcher_icon",
//         color: "#7e55c3",
//         default_sound: true,
//         priority: "high",
//       },
//     },
//     data: {
//       context: "likes",
//     },
//     token: receivedToken,
//   };

//   getMessaging()
//     .send(message)
//     .then((response) => {
//       res.status(200).json({
//         message: "Successfully sent message",
//         token: receivedToken,
//       });
//       console.log("Successfully sent message:", response);
//     })
//     .catch((error) => {
//       res.status(400);
//       res.send(error);
//       console.log("Error sending message:", error);
//     });
// });
