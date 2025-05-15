const express = require("express");
const router = express.Router();
const db = require("../middleware/db");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");

//Get all orders
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM orders");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Get order by id
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM orders
      WHERE id = $1
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create order
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, total_amount, status, shipping_address } = req.body;
    const query = `
      INSERT INTO orders (user_id, total_amount, status, shipping_address)
      VALUES ($1, $2, $3, $4)
    `;
    const { rows } = await db.query(query, [
      user_id,
      total_amount,
      status,
      shipping_address,
    ]);
    res.json(rows([0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Update order
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, total_amount, status, shipping_address } = req.body;
    const query = `
      UPDATE orders
      SET user_id = $1, total_amount = $2, status = $3, shipping_address = $4
      WHERE id = $5
      RETURNING *
    `;
    const { rows } = await db.query(query, [
      user_id,
      total_amount,
      status,
      shipping_address,
      id,
    ]);
    res.json(rows([0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Delete order
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM orders
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows([0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
