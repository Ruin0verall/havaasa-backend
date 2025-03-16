import express from "express";
import { db } from "../db";
import { upload } from "../middleware/upload";
import { uploadFile } from "../utils/storage";
import { isSocialMediaCrawler } from "../utils/crawlerDetector";
import { generateMetaHTML } from "../utils/metaTagTemplate";
import NodeCache from "node-cache";
import compression from "compression";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import helmet from "helmet";
import { body, param, validationResult } from "express-validator";

const router = express.Router();

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Add security headers
router.use(helmet());

// Add compression middleware
router.use(compression());

// Add rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
});

router.use(limiter);

// Add performance logging middleware
const performanceLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
};

router.use(performanceLogger);

// Error handling middleware
const errorHandler = (
  error: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error("Error:", error);

  // Handle specific error types
  if (error.code === "23505") {
    return res.status(409).json({
      error: "Conflict",
      message: "Resource already exists",
    });
  }

  // Default error response
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "An unexpected error occurred",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

// Image optimization function
const optimizeImage = async (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer)
    .resize(1200, 630, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
};

// Validation middleware for article creation
const validateArticleCreate = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("content").trim().notEmpty().withMessage("Content is required"),
  body("category_id").isInt().withMessage("Valid category ID is required"),
  body("excerpt").optional().trim(),
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Middleware to handle authentication
const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await db.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Add user and token to request object
    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Get all articles with caching
router.get("/", async (req, res, next) => {
  try {
    const cacheKey = "all_articles";
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit: Returning cached articles");
      return res.json(cachedData);
    }

    console.log("Cache miss: Fetching articles from database");
    const { data, error } = await db
      .from("articles")
      .select(
        `
        *,
        categories (
          name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Store in cache
    cache.set(cacheKey, data);

    // Set cache headers
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(data);
  } catch (error: any) {
    next(error);
  }
});

// Get latest articles with optimized query and caching
router.get("/latest", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const cacheKey = `latest_articles_p${page}_l${limit}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit: Returning cached latest articles");
      return res.json(cachedData);
    }

    console.log("Cache miss: Fetching latest articles from database");
    // Optimized single query with count
    const { data, error, count } = await db
      .from("articles")
      .select(
        `
        *,
        categories (
          name
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);
    const response = {
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    };

    // Cache the response
    cache.set(cacheKey, response);
    res.json(response);
  } catch (error: any) {
    console.error("Error fetching latest articles:", error);
    next(error);
  }
});

// Get single article with caching and conditional response
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const baseUrl = "https://www.havaasa.com";
    const userAgent = req.headers["user-agent"] || "";
    const cacheKey = `article_${id}`;

    // Check cache first
    const cachedArticle = cache.get(cacheKey);
    if (cachedArticle && !isSocialMediaCrawler(userAgent)) {
      console.log("Cache hit: Returning cached article");
      return res.json(cachedArticle);
    }

    console.log("Cache miss: Fetching article from database");
    const { data: article, error } = await db
      .from("articles")
      .select(
        `
        *,
        categories (
          name
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (!article) {
      if (isSocialMediaCrawler(userAgent)) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Article Not Found | Gaafu Magazine</title>
              <meta name="description" content="The requested article could not be found." />
            </head>
            <body>
              <h1>Article Not Found</h1>
              <p>The requested article could not be found.</p>
            </body>
          </html>
        `);
      }
      return res.status(404).json({ message: "Article not found" });
    }

    // Default fallback image URL using existing og-image.png
    const defaultImageUrl = `${baseUrl}/og-image.png`;

    // Ensure image_url is absolute and uses HTTPS, or use fallback
    const imageUrl = article.image_url
      ? article.image_url.startsWith("http")
        ? article.image_url.replace("http://", "https://")
        : `https://www.havaasa.com${article.image_url}`
      : defaultImageUrl;

    // Get category name for better OG description
    const categoryName = article.categories?.name || "";

    const metadata = {
      ...article,
      og: {
        title: article.title,
        description:
          article.excerpt ||
          (article.content ? article.content.substring(0, 200) + "..." : ""),
        image: imageUrl,
        url: `${baseUrl}/article/${article.id}`,
        type: "article",
        site_name: "Gaafu Magazine",
        locale: "dv_MV",
        category: categoryName,
      },
    };

    // Cache the metadata for non-crawler requests
    if (!isSocialMediaCrawler(userAgent)) {
      cache.set(cacheKey, metadata);
    }

    // If it's a social media crawler, return pre-rendered HTML
    if (isSocialMediaCrawler(userAgent)) {
      try {
        const html = generateMetaHTML({
          title: metadata.og.title,
          description: metadata.og.description,
          image: metadata.og.image,
          url: metadata.og.url,
          type: metadata.og.type,
          site_name: metadata.og.site_name,
        });

        // Set headers for better crawler support
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("X-Robots-Tag", "all");
        return res.status(200).send(html);
      } catch (error) {
        console.error("Error generating HTML:", error);
        return res.status(500).send("Internal Server Error");
      }
    }

    // For regular requests, return JSON
    res.json(metadata);
  } catch (error: any) {
    console.error("Error fetching article:", error);
    next(error);
  }
});

// Modify the create article route to include validation and image optimization
router.post(
  "/",
  requireAuth,
  upload.single("image"),
  validateArticleCreate,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      let imageUrl = null;

      if (req.file) {
        try {
          console.log("Processing image upload...");
          // Optimize image before upload
          const optimizedBuffer = await optimizeImage(req.file.buffer);
          const uploadResult = await uploadFile(
            optimizedBuffer,
            req.file.originalname
          );
          imageUrl = uploadResult.url;
          console.log("Image uploaded successfully:", { url: imageUrl });
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          return res.status(500).json({
            error: "Failed to upload image",
            details: uploadError.message,
          });
        }
      }

      const { title, content, excerpt, category_id } = req.body;

      const articleData = {
        title: title.trim(),
        content: content.trim(),
        category_id: parseInt(category_id, 10),
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        ...(excerpt && { excerpt: excerpt.trim() }),
      };

      const { data: article, error: dbError } = await db
        .from("articles")
        .insert([articleData])
        .select()
        .single();

      if (dbError) throw dbError;

      if (!article) {
        throw new Error("Article creation failed - no data returned");
      }

      // Clear the all_articles cache when new article is created
      cache.del("all_articles");

      // Clear any cached latest articles
      const keys = cache.keys();
      keys.forEach((key) => {
        if (key.startsWith("latest_articles_")) {
          cache.del(key);
        }
      });

      res.status(201).json(article);
    } catch (error: any) {
      next(error);
    }
  }
);

// Update article with image upload
router.put(
  "/:id",
  requireAuth,
  upload.single("image"),
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const { id } = req.params;
      const updates: any = { ...req.body };

      // Upload new image if provided
      if (req.file) {
        try {
          console.log("Processing image upload for update...");
          const uploadResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            (req as any).token
          );
          updates.image_url = uploadResult.url;
          updates.image_path = uploadResult.path;
          console.log("Image uploaded successfully:", {
            url: updates.image_url,
            path: updates.image_path,
          });
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          return res.status(500).json({
            error: "Failed to upload image",
            details: uploadError.message,
          });
        }
      }

      const { data: article, error } = await db
        .from("articles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json(article);
    } catch (error: any) {
      next(error);
    }
  }
);

// Delete article
router.delete(
  "/:id",
  requireAuth,
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const { id } = req.params;

      // First, get the article to check if it has an image
      const { data: article, error: fetchError } = await db
        .from("articles")
        .select("image_path")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Delete the article
      const { error: deleteError } = await db
        .from("articles")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      res.json({ message: "Article deleted successfully" });
    } catch (error: any) {
      next(error);
    }
  }
);

// Add error handler at the end
router.use(errorHandler);

export default router;
