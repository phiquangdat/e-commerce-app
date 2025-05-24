const express = require("express");
const router = express.Router;
const db = require("../middleware/db");

const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");

//Get all cart_items
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const rows = await db.query(`SELECT * FROM cart_items;`);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Get a single cart_items
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM cart_items
      WHERE id = $1;
    `;
    const rows = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create new cart_items
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { cart_id, product_id, quantity } = req.body;
    const query = `
      INSERT INTO cart_items (cart_id , product_id, quantity)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const rows = await db.query(query, [cart_id, product_id, quantity]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Update cart_items
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { cart_id, product_id, quantity } = req.body;
    const query = `
      UPDATE cart_items
      SET cart_id = $1, product_id = $2, quantity = $3
      WHERE id = $4
      RETURNING *;
    `;
    const { rows } = await db.query(query, [cart_id, product_id, quantity, id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(501).json({ error: error.message });
  }
});

//Delete cart_items
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM cart_items
      WHERE id = $1
      RETURNING *;
    `;
    const { rows } = await db.query(query, [id]);
    res.status(204).json(rows[0]);
  } catch (error) {
    res.status(504).json({ error: error.message });
  }
});

module.exports = router;
