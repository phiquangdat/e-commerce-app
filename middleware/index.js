const { authenticateToken } = require("./auth");
const { isAdmin } = require("./admin");
const {
  validate,
  userValidationRules,
  productValidationRules,
} = require("./validation");
const { errorHandler } = require("./error");

module.exports = {
  authenticateToken,
  isAdmin,
  validate,
  userValidationRules,
  productValidationRules,
  errorHandler,
};
