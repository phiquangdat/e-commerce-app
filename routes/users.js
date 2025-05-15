const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");

// Get all users
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM users");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single user
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
     SELECT * FROM users
     WHERE id = $1 
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create user
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, email, password_hash, username, address, phone } = req.body;
    const query = `
      INSERT INTO users (name, email, password_hash, username, address, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await db.query(query, [name, email, password_hash, username, address, phone]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message});
  }
});

//Update user
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password_hash, username, address, phone } = req.body;
    const query = `
      UPDATE users
      SET name = $1, email = $2, password_hash = $3, username = $4, address = $5, phone = $6
      WHERE id = $7
    `;
    const { rows } = await db.query(query, [name, email, password_hash, username, address, phone, id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message});
  }
});

//Delete user
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM users
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
