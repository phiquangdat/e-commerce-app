const isAdmin = (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  isAdmin,
};
