import { Router } from "express";
import { supabase } from "../config/supabase";

const router = Router();

// Get all categories
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    next(error);
  }
});

// Create category
router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Category name is required",
      });
    }

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name, description }])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error("Error creating category:", error);
    next(error);
  }
});

export default router;
