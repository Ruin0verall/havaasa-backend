// Core dependencies
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";

// Middleware imports
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";

// Route imports
import articlesRouter from "./routes/articles";
import categoriesRouter from "./routes/categories";
import authRouter from "./routes/auth";

// Initialize environment variables
dotenv.config();

// Create Express application
const app = express();

// Global middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8082",
      "http://127.0.0.1:8082",
      "https://gaafu-magazine-test-eight.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    optionsSuccessStatus: 200,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use(requestLogger);

// API routes
app.use("/api/articles", articlesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/auth", authRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling for invalid JSON
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON format" });
    }
    next(err);
  }
);

// Global error handling
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Server initialization
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("CORS enabled for origins:", [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "https://gaafu-magazine-test-eight.vercel.app",
  ]);
});

export default app;
