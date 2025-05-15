const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const pool = require("../config/db");

//Local strategy
passport.use(
  new LocalStrategy(function verify(username, password, cb) {
    pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (err, user) => {
        if (err) {
          return cb(err);
        }
        if (!user) {
          return cb(null, false, { message: "Incorrect username or password" });
        }
        bcrypt.compare(password, user.password, (err, res) => {
          if (res) {
            return cb(null, user);
          } else {
            return cb(null, false, {
              message: "Incorrect username or password",
            });
          }
        });
      }
    );
  })
);

//JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async function verify(payload, done) {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = ?", [
        payload.id,
      ]);
      const user = result.rows[0];

      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

module.exports = passport;
