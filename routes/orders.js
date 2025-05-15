// routes/orders.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

// Validation middleware
const validateOrder = [
  body("shipping_address")
    .notEmpty()
    .withMessage("Shipping address is required"),
];

// Get all orders for current user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
            SELECT 
                o.*,
                COUNT(*) OVER() as total_count
            FROM orders o
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `;
    const { rows } = await pool.query(query, [userId, limit, offset]);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      orders: rows,
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

// Get specific order
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
            SELECT 
                o.*,
                oi.id as order_item_id,
                oi.quantity,
                oi.price_at_time,
                p.id as product_id,
                p.name,
                p.description,
                p.category
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1 AND o.user_id = $2
        `;
    const { rows } = await pool.query(query, [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Format the response
    const order = {
      id: rows[0].id,
      user_id: rows[0].user_id,
      total_amount: rows[0].total_amount,
      status: rows[0].status,
      shipping_address: rows[0].shipping_address,
      created_at: rows[0].created_at,
      items: rows.map((row) => ({
        order_item_id: row.order_item_id,
        product_id: row.product_id,
        name: row.name,
        description: row.description,
        category: row.category,
        quantity: row.quantity,
        price_at_time: row.price_at_time,
      })),
    };

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create new order from cart
router.post("/", authenticateToken, validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { shipping_address } = req.body;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get cart items with stock check
      const cartQuery = `
                SELECT 
                    ci.*,
                    p.price,
                    p.stock_quantity,
                    p.name
                FROM cart_items ci
                JOIN carts c ON ci.cart_id = c.id
                JOIN products p ON ci.product_id = p.id
                WHERE c.user_id = $1
            `;
      const cartResult = await client.query(cartQuery, [userId]);

      if (cartResult.rows.length === 0) {
        throw new Error("Cart is empty");
      }

      // Check stock availability
      const outOfStockItems = cartResult.rows.filter(
        (item) => item.stock_quantity < item.quantity
      );
      if (outOfStockItems.length > 0) {
        throw new Error(
          `Insufficient stock for: ${outOfStockItems
            .map((item) => item.name)
            .join(", ")}`
        );
      }

      // Calculate total
      const total = cartResult.rows.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (
                    user_id,
                    total_amount,
                    shipping_address,
                    status
                ) VALUES ($1, $2, $3, $4)
                RETURNING id`,
        [userId, total, shipping_address, "pending"]
      );

      const orderId = orderResult.rows[0].id;

      // Create order items and update stock
      for (const item of cartResult.rows) {
        await client.query(
          `INSERT INTO order_items (
                        order_id,
                        product_id,
                        quantity,
                        price_at_time
                    ) VALUES ($1, $2, $3, $4)`,
          [orderId, item.product_id, item.quantity, item.price]
        );

        await client.query(
          `UPDATE products 
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await client.query(
        `DELETE FROM cart_items ci
                USING carts c
                WHERE ci.cart_id = c.id AND c.user_id = $1`,
        [userId]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message: "Order created successfully",
        orderId: orderId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
