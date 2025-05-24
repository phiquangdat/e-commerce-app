/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required:
 *         - product_id
 *         - quantity
 *       properties:
 *         id:
 *           type: integer
 *           description: The cart item id
 *         cart_id:
 *           type: integer
 *           description: The cart id
 *         product_id:
 *           type: integer
 *           description: The product id
 *         quantity:
 *           type: integer
 *           description: The quantity of the product
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
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
/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user's cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cart_id:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CartItem'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_items:
 *                       type: integer
 *                     total_amount:
 *                       type: number
 */
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
                p.stock_quantity
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            LEFT JOIN products p ON ci.product_id = p.id
            WHERE c.user_id = $1
        `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Add item to cart
/**
 * @swagger
 * /cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *             properties:
 *               product_id:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/items", authenticateToken, validateCartItem, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { product_id, quantity } = req.body;

    // Check if product exists and has enough stock
    const productCheck = await pool.query(
      "SELECT stock_quantity FROM products WHERE id = $1",
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (productCheck.rows[0].stock_quantity < quantity) {
      return res.status(400).json({ message: "Not enough stock available" });
    }

    // Get or create cart
    let cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );

    let cartId;
    if (cartResult.rows.length === 0) {
      const newCart = await pool.query(
        "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
        [userId]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Add item to cart
    const result = await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (cart_id, product_id)
            DO UPDATE SET quantity = cart_items.quantity + $3
            RETURNING *`,
      [cartId, product_id, quantity]
    );

    res.json(result.rows[0]);
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

      // Check product stock
      const stockCheck = await pool.query(
        `SELECT p.stock_quantity 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = $1`,
        [id]
      );

      if (stockCheck.rows.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      if (stockCheck.rows[0].stock_quantity < quantity) {
        return res.status(400).json({ message: "Not enough stock available" });
      }

      // Update quantity
      const result = await pool.query(
        `UPDATE cart_items ci
            SET quantity = $1
            FROM carts c
            WHERE ci.id = $2 
            AND ci.cart_id = c.id 
            AND c.user_id = $3
            RETURNING ci.*`,
        [quantity, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json(result.rows[0]);
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
