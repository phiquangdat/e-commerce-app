const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const db = require("./db");

const sessionConfig = {
  store: new pgSession({
    pool: db.pool,
    tableName: "sessions",
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
};

module.exports = sessionConfig;
