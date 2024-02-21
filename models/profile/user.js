const mongoose = require("mongoose");
// const crypto = require("crypto");
const bcrypt = require("bcrypt"); // Add this line

const { ObjectId } = mongoose.Schema;

const userSchema = mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, index: true },
    password: { type: String },
    device_tokens: [{ type: String }],
    images: [{ type: String }],
    profilePhoto: { type: String },
    profileScore: { type: Number, default: 50 },
    phoneNo: { type: Number, index: true },
    // loc: {
    //   type: { type: String },
    //   coordinates: [Number],
    // },
    height: { type: Number},
    live: { type: String },
    belongTo: { type: String },
    relationStatus: { type: String },
    degree: { type: String },
    institute: { type: String },
    designation: { type: String },
    gender: { type: String },
    dob: { type: Date },
    company: { type: String },        ///
    location:{type: String },         ///
    job: { type: String },           ///
    college: { type: String },      ///
    about: { type: String }, ///
    income: { type: String },
    describe: [{ type: String }],
    visibility: { type: Number, default: 0 }, //0 means Visible to everyone, 1 means private
    bio: { type: String },
    spark: { type: Number, default: 1 },
    isOnline: { type: Number, default: 0 }, //0 means online, 1 means offine
    basic_Info: {
      type: ObjectId,
      ref: "Basic_Info",
      index: true,
    },
  },
  { timestamps: true }
);
userSchema.index({ loc: "2dsphere" });




// Hash the password before saving it to the database
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare the provided password with the stored hashed password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


module.exports = mongoose.model("User", userSchema);
