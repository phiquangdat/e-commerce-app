const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.Headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) res.redirect("/login");
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        console.log("Invalid token");
        res.redirect("/login");
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.send(error.message);
  }
};

module.exports = {
  authenticateToken,
};
