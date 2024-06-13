const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./utils/logger");
const connectDB = require("./config/db");
const app = express();
const postRoutes = require("./routes/postRoutes");
const errorHandler = require("./middlewares/errorHandler");
const bodyParser = require('body-parser');

connectDB();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(helmet());
app.use(logger);
app.use(express.static('public'))

app.use(errorHandler);

app.use("/api/posts", postRoutes);
module.exports = app;
