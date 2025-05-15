const express = require("express");
const router = express.Router();
const db = require("../middleware/db");

const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");

//Get all carts
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const query = `
      SELECT * FROM carts;
    `;
    const { rows } = await db.query(query);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Get a single cart
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM carts
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create new cart
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id } req.params;
    const query = `
      INSERT INTO carts (user_id)
      VALUES ($1);
    `;
    const { rows } = await db.query(query, [user_id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Update carts
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const query = `
      UPDATE carts
      SET user_id = $1
      WHERE id = $2;
      RETURNING *
    `;
    const { rows } = await db.query(query, [user_id, id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Delete cart
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM carts
      WHERE id = $1;
      RETURNING *
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
