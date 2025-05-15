const express = require("express");
const router = express.Router;
const db = require("../middleware/db");

const { authenticateToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/admin");

//Get all reviews
router.get("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const query = `
      SELECT * FROM reviews;
    `;
    const { rows } = await db.query(query);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Get a single review
router.get("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM reviews
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Create new review
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { user_id, product_id, rating, comments } = req.body;
    const query = `
      INSERT INTO reviews ( user_id, product_id, rating, comments )
      VALUES ($1, $2, $3, $4);
    `;
    const { rows } = await db.query(query, [
      user_id,
      product_id,
      rating,
      comments,
    ]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Update review
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, product_id, rating, comments } = req.body;
    const query = `
      UPDATE reviews
      SET user_id = $1, product_id = $2, rating = $3, comments = $4
      WHERE id = $5;
    `;
    const { rows } = await db.query(query, [
      user_id,
      product_id,
      rating,
      comments,
    ]);
    res.json({ error: error.message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//Delete review
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      DELETE FROM reviews
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
