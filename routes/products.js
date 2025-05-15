// routes/products.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");
const { body, validationResult } = require("express-validator");

// Validation middleware
const validateProduct = [
  body("name").notEmpty().withMessage("Name is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("stock_quantity")
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be a positive number"),
  body("category").notEmpty().withMessage("Category is required"),
];

// Get all products with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const validSortColumns = ["name", "price", "created_at", "stock_quantity"];
    const validSortOrders = ["asc", "desc"];

    // Validate sort parameters
    if (!validSortColumns.includes(sortBy)) {
      return res.status(400).json({ error: "Invalid sort column" });
    }
    if (!validSortOrders.includes(sortOrder.toLowerCase())) {
      return res.status(400).json({ error: "Invalid sort order" });
    }

    // Build query conditions
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (category) {
      conditions.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (search) {
      conditions.push(
        `(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`
      );
      values.push(`%${search}%`);
      paramCount++;
    }

    if (minPrice) {
      conditions.push(`price >= $${paramCount}`);
      values.push(minPrice);
      paramCount++;
    }

    if (maxPrice) {
      conditions.push(`price <= $${paramCount}`);
      values.push(maxPrice);
      paramCount++;
    }

    // Build the query
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        p.*,
        COUNT(*) OVER() as total_count,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);
    const { rows } = await pool.query(query, values);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      products: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get single product with reviews
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { includeReviews = false } = req.query;

    const productQuery = `
      SELECT 
        p.*,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
    const productResult = await pool.query(productQuery, [id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = productResult.rows[0];

    if (includeReviews) {
      const reviewsQuery = `
        SELECT 
          r.*,
          u.username
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = $1
        ORDER BY r.created_at DESC
      `;
      const reviewsResult = await pool.query(reviewsQuery, [id]);
      product.reviews = reviewsResult.rows;
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create new product (admin only)
router.post(
  "/",
  authenticateToken,
  isAdmin,
  validateProduct,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, price, category, stock_quantity } = req.body;

      const query = `
      INSERT INTO products (name, description, price, category, stock_quantity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
      const { rows } = await pool.query(query, [
        name,
        description,
        price,
        category,
        stock_quantity,
      ]);

      res.status(201).json(rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update product (admin only)
router.put(
  "/:id",
  authenticateToken,
  isAdmin,
  validateProduct,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, description, price, category, stock_quantity } = req.body;

      const query = `
      UPDATE products
      SET 
        name = $1,
        description = $2,
        price = $3,
        category = $4,
        stock_quantity = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
      const { rows } = await pool.query(query, [
        name,
        description,
        price,
        category,
        stock_quantity,
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete product (admin only)
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const checkQuery = "SELECT id FROM products WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if product is in any active orders
    const orderCheckQuery = `
      SELECT EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = $1 AND o.status != 'cancelled'
      )
    `;
    const orderCheckResult = await pool.query(orderCheckQuery, [id]);

    if (orderCheckResult.rows[0].exists) {
      return res.status(400).json({
        message: "Cannot delete product that has been ordered",
      });
    }

    // Delete product
    await pool.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get product categories
router.get("/categories/all", async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category
      FROM products
      ORDER BY category
    `;
    const { rows } = await pool.query(query);
    res.json(rows.map((row) => row.category));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
