const express = require("express");
const router = express.Router;
const db = require("../middleware/db");

const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");

//Get all order_items
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM order_items;`);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Get a single order_items
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM order_items
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create new order_items
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { order_id, product_id, quantity } = req.body;
    const query = `
      INSERT INTO order_items
      SET order_id = $1, product_id = $2, quantity = $3
    `;
    const { rows } = await db.query(query, [order_id, product_id, quantity]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Update order_items
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_id, product_id, quantity } = req.body;
    const query = `
      UPDATE order_items
      SET order_id = $1, product_id = $2, quantity = $3
      WHERE id = $4
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      order_id,
      product_id,
      quantity,
      id,
    ]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Delete order_items
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM order_items
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
