// routes/carts.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

// Validation middleware
const validateCartItem = [
  body("product_id").isInt().withMessage("Product ID must be a number"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

// Get user's cart
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
            SELECT 
                c.id as cart_id,
                ci.id as cart_item_id,
                ci.quantity,
                p.id as product_id,
                p.name,
                p.price,
                p.description,
                p.category,
                p.stock_quantity,
                (p.price * ci.quantity) as item_total
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            LEFT JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1
        `;
    const { rows } = await pool.query(query, [userId]);

    // Calculate cart totals
    const cartTotal = rows.reduce(
      (sum, item) => sum + (item.item_total || 0),
      0
    );
    const itemCount = rows.reduce((sum, item) => sum + (item.quantity || 0), 0);

    res.json({
      cart_id: rows[0]?.cart_id,
      items: rows,
      summary: {
        total_items: itemCount,
        total_amount: cartTotal,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Add item to cart
router.post("/items", authenticateToken, validateCartItem, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check product existence and stock
      const productCheck = await client.query(
        "SELECT stock_quantity FROM products WHERE id = $1",
        [product_id]
      );

      if (productCheck.rows.length === 0) {
        throw new Error("Product not found");
      }

      if (productCheck.rows[0].stock_quantity < quantity) {
        throw new Error("Not enough stock available");
      }

      // Get or create cart
      let cartResult = await client.query(
        "SELECT id FROM carts WHERE user_id = $1",
        [userId]
      );

      let cartId;
      if (cartResult.rows.length === 0) {
        const newCart = await client.query(
          "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
          [userId]
        );
        cartId = newCart.rows[0].id;
      } else {
        cartId = cartResult.rows[0].id;
      }

      // Add or update cart item
      const result = await client.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
                VALUES ($1, $2, $3)
                ON CONFLICT (cart_id, product_id)
                DO UPDATE SET 
                    quantity = cart_items.quantity + $3,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *`,
        [cartId, product_id, quantity]
      );

      await client.query("COMMIT");

      res.json({
        message: "Item added to cart",
        cart_item: result.rows[0],
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

// Update cart item quantity
router.put(
  "/items/:id",
  authenticateToken,
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { quantity } = req.body;
      const userId = req.user.id;

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Check product stock
        const stockCheck = await client.query(
          `SELECT p.stock_quantity
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.id = $1`,
          [id]
        );

        if (stockCheck.rows.length === 0) {
          throw new Error("Cart item not found");
        }

        if (stockCheck.rows[0].stock_quantity < quantity) {
          throw new Error("Not enough stock available");
        }

        // Update quantity
        const result = await client.query(
          `UPDATE cart_items ci
                SET quantity = $1, updated_at = CURRENT_TIMESTAMP
                FROM carts c
                WHERE ci.id = $2 
                AND ci.cart_id = c.id 
                AND c.user_id = $3
                RETURNING ci.*`,
          [quantity, id, userId]
        );

        if (result.rows.length === 0) {
          throw new Error("Cart item not found or unauthorized");
        }

        await client.query("COMMIT");

        res.json(result.rows[0]);
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
  }
);

// Remove item from cart
router.delete("/items/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `DELETE FROM cart_items ci
            USING carts c
            WHERE ci.id = $1 
            AND ci.cart_id = c.id 
            AND c.user_id = $2
            RETURNING ci.*`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Clear cart
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `DELETE FROM cart_items ci
            USING carts c
            WHERE ci.cart_id = c.id 
            AND c.user_id = $1`,
      [userId]
    );

    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
