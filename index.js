const express = require("express");
const cors = require("cors");
const articleRoutes = require("./routes/articles");

const app = express();

// Enable pre-flight requests for all routes
app.options("*", cors());

// CORS middleware configuration
app.use(
  cors({
    origin: "*", // Allow all origins for crawler access
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "User-Agent"],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/articles", articleRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
