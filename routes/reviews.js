// routes/reviews.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");
const { body, validationResult } = require("express-validator");

// Validation middleware
const validateReview = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comments")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comments must be less than 1000 characters"),
];

// Get all reviews for a product
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
            SELECT 
                r.*,
                u.username,
                COUNT(*) OVER() as total_count
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;
    const { rows } = await pool.query(query, [productId, limit, offset]);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      reviews: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's reviews
router.get("/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
            SELECT 
                r.*,
                p.name as product_name,
                COUNT(*) OVER() as total_count
            FROM reviews r
            JOIN products p ON r.product_id = p.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        `;
    const { rows } = await pool.query(query, [userId, limit, offset]);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      reviews: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new review
router.post("/", authenticateToken, validateReview, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { product_id, rating, comments } = req.body;

    // Check if user has purchased the product
    const purchaseCheck = await pool.query(
      `SELECT EXISTS (
                SELECT 1 FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = $1 AND oi.product_id = $2
            )`,
      [userId, product_id]
    );

    if (!purchaseCheck.rows[0].exists) {
      return res.status(403).json({
        message: "You can only review products you have purchased",
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await pool.query(
      "SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2",
      [userId, product_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    const query = `
            INSERT INTO reviews (user_id, product_id, rating, comments)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
    const { rows } = await pool.query(query, [
      userId,
      product_id,
      rating,
      comments,
    ]);

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update review
router.put("/:id", authenticateToken, validateReview, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const { rating, comments } = req.body;

    // Check if review exists and belongs to user
    const reviewCheck = await pool.query(
      "SELECT id FROM reviews WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Review not found or you don't have permission to update it",
      });
    }

    const query = `
            UPDATE reviews
            SET rating = $1, comments = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4
            RETURNING *
        `;
    const { rows } = await pool.query(query, [rating, comments, id, userId]);

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete review
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const reviewCheck = await pool.query(
      "SELECT id FROM reviews WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Review not found or you don't have permission to delete it",
      });
    }

    await pool.query("DELETE FROM reviews WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
// Get all reviews (admin only)
router.get("/admin/all", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
            SELECT 
                r.*,
                u.username,
                p.name as product_name,
                COUNT(*) OVER() as total_count
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            ORDER BY r.created_at DESC
            LIMIT $1 OFFSET $2
        `;
    const { rows } = await pool.query(query, [limit, offset]);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      reviews: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete any review (admin only)
router.delete("/admin/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
