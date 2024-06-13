// models/Meme.js
const mongoose = require("mongoose");
const CommentSchema = require("./postComment");

const MemeSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: false,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userIp: {
    type: String,
    required: true,
  },
  isHateSpeech : {
    type: Boolean,
    default: false
  },
  comments: [CommentSchema]
});

module.exports = mongoose.model("Meme", MemeSchema);
