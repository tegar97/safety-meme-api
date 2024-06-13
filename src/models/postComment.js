const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = CommentSchema;
