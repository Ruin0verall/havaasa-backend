import express from "express";
import { db } from "../db";
import { upload } from "../middleware/upload";
import { uploadFile } from "../utils/storage";
import { isSocialMediaCrawler } from "../utils/crawlerDetector";
import { generateMetaHTML } from "../utils/metaTagTemplate";

const router = express.Router();

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

// Get all articles
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await db
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching articles:", error);
    next(error);
  }
});

// Get latest articles with pagination
router.get("/latest", async (req, res, next) => {
  try {
    // Get page and limit from query params, default to page 1 and limit 10
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const { count } = await db
      .from("articles")
      .select("*", { count: "exact", head: true });

    // Get paginated articles with categories
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
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calculate total pages
    const totalPages = Math.ceil((count || 0) / limit);

    // Return response with pagination metadata
    res.json({
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error fetching latest articles:", error);
    next(error);
  }
});

// Get single article
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const baseUrl = "https://gaafu-magazine-test-eight.vercel.app";
    const userAgent = req.headers["user-agent"] || "";

    // Log incoming requests for debugging
    console.log(`Incoming request for article ${id}:`, {
      userAgent,
      isCrawler: isSocialMediaCrawler(userAgent),
    });

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
        : `https://gaafu-magazine-test-eight.vercel.app${article.image_url}`
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

    // For regular requests, return JSON as before
    res.status(200).json(metadata);
  } catch (error: any) {
    console.error("Error fetching article:", error);
    if (isSocialMediaCrawler(req.headers["user-agent"] || "")) {
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error | Gaafu Magazine</title>
            <meta name="description" content="An error occurred while fetching the article." />
          </head>
          <body>
            <h1>Error</h1>
            <p>An error occurred while fetching the article.</p>
          </body>
        </html>
      `);
    }
    next(error);
  }
});

// Create article with image upload
router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  try {
    console.log("Creating article with data:", {
      ...req.body,
      file: req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "not present",
    });

    let imageUrl = null;

    // Upload image if provided
    if (req.file) {
      try {
        console.log("Processing image upload...");
        const uploadResult = await uploadFile(
          req.file.buffer,
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

    // Validate required fields
    if (!title || !content || !category_id) {
      console.error("Missing required fields:", {
        title,
        content,
        category_id,
      });
      return res.status(400).json({
        error: "Missing required fields",
        details: {
          title: !title,
          content: !content,
          category_id: !category_id,
        },
      });
    }

    // Create article data object matching the database schema
    const articleData = {
      title: title.trim(),
      content: content.trim(),
      category_id: parseInt(category_id, 10), // Ensure category_id is a number
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      ...(excerpt && { excerpt: excerpt.trim() }),
    };

    console.log("Attempting to insert article with data:", articleData);

    const { data: article, error: dbError } = await db
      .from("articles")
      .insert([articleData])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!article) {
      throw new Error("Article creation failed - no data returned");
    }

    console.log("Article created successfully:", article);
    res.status(201).json(article);
  } catch (error: any) {
    console.error("Error creating article:", error);
    res.status(500).json({
      error: "Failed to create article",
      details: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
});

// Update article with image upload
router.put("/:id", requireAuth, upload.single("image"), async (req, res) => {
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
    console.error("Error updating article:", error);
    res.status(500).json({
      error: "Failed to update article",
      details: error.message,
    });
  }
});

// Delete article
router.delete("/:id", requireAuth, async (req, res) => {
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
    console.error("Error deleting article:", error);
    res.status(500).json({
      error: "Failed to delete article",
      details: error.message,
    });
  }
});

export default router;
