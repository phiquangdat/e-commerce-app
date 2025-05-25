const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE,
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  connect: async () => {
    try {
      await pool.connect();
      console.log("Connected to database successfully");
    } catch (err) {
      console.error("Error connecting to database", err);
      throw err;
    }
  },
};
