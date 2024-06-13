const axios = require("axios");
const postModel = require("../models/postModel");
const FormData = require("form-data");
const multer = require("multer");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const { promisify } = require("util");
const randomBytes = promisify(crypto.randomBytes);

// Configure AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Function to upload image to S3
const uploadImageToS3 = async (file) => {
  const rawBytes = await randomBytes(16);
  const imageName = rawBytes.toString("hex") + file.originalname;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: imageName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
};

exports.createPost = async (req, res) => {
  // Use multer to handle the file upload
  upload.single("image")(req, res, async function (err) {
    if (err) {
      return res.status(500).json({ message: "Error uploading image" });
    }

    try {
      const { content, guestId } = req.body;
      let image = null;

      if (req.file) {
        image = await uploadImageToS3(req.file);
      }

      // Create form-data for prediction request
      const form = new FormData();
      form.append("text", content);
      if (image) {
        form.append("image", image);
      }

      // Call prediction API with form-data
      try {
        const response = await axios.post(
          "http://127.0.0.1:5000/predict",
          form,
          {
            headers: form.getHeaders(),
          }
        );
        const { probability, result } = response.data;
        // Get user IP from request
        const userIp =
          req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        // Check if the hate speech probability is over 85%
        if (result === "Hate Speech") {
          const newPost = new postModel({
            content,
            createdBy: guestId,
            isHateSpeech: true,
            userIp,
            imageUrl: image, // Save the image URL
          });
          await newPost.save();
          return res.status(200).json({
            message: "Error: Hate Speech Detected",
            probability: probability * 100,
          });
        }

        // Create new post
        const newPost = new postModel({
          content,
          createdBy: guestId,
          isHateSpeech: result === "Hate Speech",
          userIp,
          imageUrl: image, // Save the image URL
        });

        await newPost.save();
        res.status(201).json(newPost);
      } catch (err) {
        console.error("Error calling prediction API:", err.message);
        res.status(500).json({ message: "Error calling prediction API" });
      }
    } catch (error) {
      console.error("Error creating post:", error.message);
      res.status(500).json({ message: error.message });
    }
  });
};
exports.getPosts = async (req, res) => {
  try {
    // find post where isHateSpeech is false
    const posts = await postModel.find({ isHateSpeech: false }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error getting posts:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getMyPost = async (req, res) => {
  try {
    // get post by spesisfic user id
    const posts = await postModel.find({ createdBy: req.query.userId });
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error getting posts:", error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.postStatics = async (req, res) => {
  try {
    // get count post and count hate speech post
    const posts = await postModel.find();
    const totalPosts = posts.length;
    const hateSpeechPosts = posts.filter((post) => post.isHateSpeech).length;
    res.status(200).json({ totalPosts, hateSpeechPosts });
  } catch (error) {
    console.error("Error getting posts:", error.message);
    res.status(500).json({ message: error.message });
  }
};

/// api get post detail

exports.getPostDetail = async (req, res) => {
  try {
    // get post by spesisfic user id
    const posts = await postModel.findById(req.params.id);
    res.status(200).json(posts);
  } catch (error) {
    console.error("Error getting posts:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// api add comments  and check comment is hate speech or not

exports.addComment = async (req, res) => {
  try {
    const { content, guestId } = req.body;
    const post = await postModel.findById(req.params.id);

    // Create form-data for prediction request
    const form = new FormData();
    form.append("text", content);

    // Call prediction API with form-data
    try {
      const response = await axios.post("http://127.0.0.1:5000/predict", form, {
        headers: form.getHeaders(),
      });
      const { probability, result } = response.data;

      // Get user IP from request
      const userIp =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      // Check if the hate speech probability is over 85%
      if (result === "Hate Speech") {
        return res.status(200).json({
          message: "Error: Hate Speech Detected",
          probability: probability * 100,
        });
      }
      post.comments.push({
        content,
        createdBy: guestId,
        isHateSpeech: result === "Hate Speech",
        userIp,
      });
      await post.save();
      res.status(201).json(post);
    } catch (err) {
      console.error("Error calling prediction API:", err.message);
      res.status(500).json({ message: "Error calling prediction API" });
    }
  } catch (error) {
    console.error("Error creating post:", error.message);
    res.status(500).json({ message: error.message });
  }
};
