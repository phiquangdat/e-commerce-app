const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const db = require("../config/database");
const auth = require("../middleware/auth");

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart items
 */
router.get("/", auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ci.*, p.name, p.price, p.stock 
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /api/cart:
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
 */
router.post(
  "/",
  auth,
  [body("product_id").isInt(), body("quantity").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { product_id, quantity } = req.body;

      // Check if product exists and has enough stock
      const productResult = await db.query(
        "SELECT * FROM products WHERE id = $1",
        [product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (productResult.rows[0].stock < quantity) {
        return res.status(400).json({ message: "Not enough stock available" });
      }

      // Add or update cart item
      const result = await db.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = cart_items.quantity + $3
         RETURNING *`,
        [req.user.id, product_id, quantity]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/cart/{product_id}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cart item updated
 *       400:
 *         description: Invalid input
 */
router.put(
  "/:product_id",
  auth,
  [body("quantity").isInt({ min: 0 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { quantity } = req.body;
      const { product_id } = req.params;

      if (quantity === 0) {
        // Remove item if quantity is 0
        await db.query(
          "DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2",
          [req.user.id, product_id]
        );
        return res.json({ message: "Item removed from cart" });
      }

      // Check if product has enough stock
      const productResult = await db.query(
        "SELECT * FROM products WHERE id = $1",
        [product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (productResult.rows[0].stock < quantity) {
        return res.status(400).json({ message: "Not enough stock available" });
      }

      // Update cart item
      const result = await db.query(
        `UPDATE cart_items 
         SET quantity = $1 
         WHERE user_id = $2 AND product_id = $3 
         RETURNING *`,
        [quantity, req.user.id, product_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @swagger
 * /api/cart/{product_id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Item removed from cart
 *       404:
 *         description: Cart item not found
 */
router.delete("/:product_id", auth, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *",
      [req.user.id, req.params.product_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
