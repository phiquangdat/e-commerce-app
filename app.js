const express = require("express");
const { errorHandler } = require("./middleware");
const app = express();
const passport = require("./config/passport");
const port = process.env.PORT || 3000;
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
// swagger definition
var swaggerDefinition = {
  info: {
    title: "Node Swagger API",
    version: "1.0.0",
    description: "Demonstrating how to describe a RESTful API with Swagger",
  },
  host: "localhost:3000",
  basePath: "/",
};

// options for the swagger docs
var options = {
  // import swaggerDefinitions
  swaggerDefinition: swaggerDefinition,
  // path to the API docs
  apis: ["./routes/*.js"],
};

// initialize swagger-jsdoc
var swaggerSpec = swaggerJSDoc(options);
// serve swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/swagger.json", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
//Middleware
app.use(express.json());
app.use(passport.initialize());

//Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/carts");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");

//Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);

//Error handling middleware
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to E-commerce API" });
});

//Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
