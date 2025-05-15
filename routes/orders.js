// routes/orders.js
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");
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
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
            SELECT 
                o.*,
                COUNT(*) OVER() as total_count,
                (
                    SELECT json_agg(
                        json_build_object(
                            'product_id', p.id,
                            'name', p.name,
                            'quantity', oi.quantity,
                            'price_at_time', oi.price_at_time
                        )
                    )
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ) as items
            FROM orders o
            WHERE o.user_id = $1
        `;
    const values = [userId];
    let paramCount = 2;

    if (status) {
      query += ` AND o.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += `
            ORDER BY o.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);

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
                (
                    SELECT json_agg(
                        json_build_object(
                            'product_id', p.id,
                            'name', p.name,
                            'description', p.description,
                            'category', p.category,
                            'quantity', oi.quantity,
                            'price_at_time', oi.price_at_time,
                            'subtotal', (oi.quantity * oi.price_at_time)
                        )
                    )
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ) as items
            FROM orders o
            WHERE o.id = $1 AND o.user_id = $2
        `;
    const { rows } = await pool.query(query, [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(rows[0]);
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

// Update order status (admin only)
router.put(
  "/:id/status",
  authenticateToken,
  isAdmin,
  [
    body("status")
      .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid status"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const query = `
            UPDATE orders
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
      const { rows } = await pool.query(query, [status, id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Cancel order
router.post("/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if order exists and belongs to user
      const orderCheck = await client.query(
        `SELECT status FROM orders 
                WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (orderCheck.rows.length === 0) {
        throw new Error("Order not found");
      }

      if (orderCheck.rows[0].status === "cancelled") {
        throw new Error("Order is already cancelled");
      }

      if (orderCheck.rows[0].status === "delivered") {
        throw new Error("Cannot cancel delivered order");
      }

      // Get order items to restore stock
      const itemsQuery = `
                SELECT product_id, quantity
                FROM order_items
                WHERE order_id = $1
            `;
      const itemsResult = await client.query(itemsQuery, [id]);

      // Restore product stock
      for (const item of itemsResult.rows) {
        await client.query(
          `UPDATE products 
                    SET stock_quantity = stock_quantity + $1
                    WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      await client.query(
        `UPDATE orders
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1`,
        [id]
      );

      await client.query("COMMIT");

      res.json({ message: "Order cancelled successfully" });
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

// Get all orders (admin only)
router.get("/admin/all", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const offset = (page - 1) * limit;

    let query = `
            SELECT 
                o.*,
                u.username,
                u.email,
                COUNT(*) OVER() as total_count,
                (
                    SELECT json_agg(
                        json_build_object(
                            'product_id', p.id,
                            'name', p.name,
                            'quantity', oi.quantity,
                            'price_at_time', oi.price_at_time
                        )
                    )
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = o.id
                ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
        `;
    const values = [];
    let paramCount = 1;

    if (status) {
      query += ` WHERE o.status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (userId) {
      query += status ? ` AND` : ` WHERE`;
      query += ` o.user_id = $${paramCount}`;
      values.push(userId);
      paramCount++;
    }

    query += `
            ORDER BY o.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);

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

// Checkout cart
router.post(
  "/checkout",
  authenticateToken,
  [
    body("shipping_address")
      .notEmpty()
      .withMessage("Shipping address is required"),
    body("payment_method")
      .isIn(["credit_card", "debit_card"])
      .withMessage("Invalid payment method"),
    body("card_number")
      .optional()
      .matches(/^\d{16}$/)
      .withMessage("Card number must be 16 digits"),
    body("expiry_date")
      .optional()
      .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
      .withMessage("Expiry date must be in MM/YY format"),
    body("cvv")
      .optional()
      .matches(/^\d{3,4}$/)
      .withMessage("CVV must be 3 or 4 digits"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user.id;
      const {
        shipping_address,
        payment_method,
        card_number,
        expiry_date,
        cvv,
      } = req.body;

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

        // Simulate payment processing
        const paymentResult = await simulatePayment({
          amount: total,
          payment_method,
          card_number,
          expiry_date,
          cvv,
        });

        if (!paymentResult.success) {
          throw new Error(paymentResult.error || "Payment processing failed");
        }

        // Create order
        const orderResult = await client.query(
          `INSERT INTO orders (
                    user_id,
                    total_amount,
                    shipping_address,
                    status,
                    payment_method,
                    payment_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id`,
          [
            userId,
            total,
            shipping_address,
            "pending",
            payment_method,
            paymentResult.payment_id,
          ]
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
          message: "Checkout successful",
          orderId: orderId,
          payment_id: paymentResult.payment_id,
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
  }
);

// Helper function to simulate payment processing
async function simulatePayment(paymentDetails) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate random payment failures (10% chance)
  if (Math.random() < 0.1) {
    return {
      success: false,
      error: "Payment declined by issuer",
    };
  }

  // Simulate card validation
  if (paymentDetails.card_number) {
    // Check if card is expired
    const [month, year] = paymentDetails.expiry_date.split("/");
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (expiryDate < new Date()) {
      return {
        success: false,
        error: "Card has expired",
      };
    }

    // Check if card number is valid (simple Luhn algorithm)
    if (!isValidCardNumber(paymentDetails.card_number)) {
      return {
        success: false,
        error: "Invalid card number",
      };
    }
  }

  // Generate a mock payment ID
  const paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    payment_id: paymentId,
  };
}

// Helper function to validate card number using Luhn algorithm
function isValidCardNumber(cardNumber) {
  let sum = 0;
  let isEven = false;

  // Loop through values starting from the rightmost digit
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

module.exports = router;
