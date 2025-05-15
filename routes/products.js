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
];

// Get all products
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;
    const query = `
            SELECT * FROM products
            WHERE 
                ($1 IS NULL OR category = $1)
                AND ($2 IS NULL OR name ILIKE $2)
            LIMIT $3 OFFSET $4
        `;
    const values = [category, search ? `%${search}%` : null, limit, offset];
    const { rows } = await pool.query(query, values);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
            SELECT * FROM products
            WHERE id = $1
        `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
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
      res.status(500).json({ error: error.message });
    }
  }
);

// Update product
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
            SET name = $1, description = $2, price = $3, category = $4, stock_quantity = $5
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
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete product
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
            DELETE FROM products
            WHERE id = $1
            RETURNING *
        `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
