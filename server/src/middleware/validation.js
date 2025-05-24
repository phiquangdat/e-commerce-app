const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const userValidationRules = () => {
  return [
    body("email").isEmail().withMessage("Invalid email address"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters long"),
  ];
};

const productValidationRules = () => {
  return [
    body("name")
      .isLength({ min: 3 })
      .withMessage("Product name must be at least 3 characters long"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
  ];
};

module.exports = {
  validate,
  userValidationRules,
  productValidationRules,
};
