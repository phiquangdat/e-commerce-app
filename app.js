const express = require("express");
const { errorHandler } = require("./middleware");
const app = express();
const port = process.env.PORT || 3000;

//Middleware
app.use(express.json());

//Routes
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/carts");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");
const adminRoutes = require("./routes/admin");

//Mount routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

//Error handling middleware
app.use(errorHandler);

//Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
