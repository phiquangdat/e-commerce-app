const express = require("express");
const { errorHandler } = require("./middleware");
const app = express();
const passport = require("./config/passport");
const port = process.env.PORT || 3000;
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
