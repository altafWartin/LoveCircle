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
  .connect(process.env.DATABASE_CLOUD, {
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
  })
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



const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port chek  ${port}`);
});

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with your service account credentials
const serviceAccount = require('./lovecircle-b5c68-firebase-adminsdk-ui9y3-1b706666d7.json');

// Check if Firebase Admin SDK has been initialized before initializing it again
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function sendPushNotification(deviceToken, title, body) {
  try {
    const message = {
      notification: {
        title: title,
        body: body
      },
      token: deviceToken
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}



app.get("/test", async (req, res, next) => {
  try {
    const deviceToken = 'c1iI3Lp4Q6Gt_fQMctG7FR:APA91bFgY6Sp0OexbxY04SY7PVqMnih-RcHbIdDH73CX-8hB7WR9aVFIujhJ5n5RKhfBx8FN86G0l9N04-ceJHlsa0bFgUH7o2n8p8WyB7rvGFv4zbbS9SnO4GW8e0GbBVJnqhw9gvNS'; 
    const title = 'Test Notification';
    const body = 'This is a test notification from your Node.js server.';

    await sendPushNotification(deviceToken, title, body);
    
    res.status(200).send("Notification sent successfully!");
  } catch (error) {
    console.error('Failed to send push notification:', error);
    res.status(500).send("Failed to send push notification");
  }
});

app.get("/", async (req, res) => {
  res.send("Hello World!");
})