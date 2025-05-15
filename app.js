const express = require("express");
const { errorHandler } = require("./middleware");
const app = express();
const passport = require("./config/passport");
const port = process.env.PORT || 3000;
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const cors = require("cors");

// swagger definition
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-commerce API",
      version: "1.0.0",
      description: "A RESTful API for an e-commerce application",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Product: {
          type: "object",
          required: ["name", "price", "category", "stock_quantity"],
          properties: {
            id: {
              type: "integer",
              description: "The auto-generated id of the product",
            },
            name: {
              type: "string",
              description: "The name of the product",
            },
            description: {
              type: "string",
              description: "The product description",
            },
            price: {
              type: "number",
              format: "float",
              description: "The product price",
            },
            category: {
              type: "string",
              description: "The product category",
            },
            stock_quantity: {
              type: "integer",
              description: "The available stock quantity",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "The creation timestamp",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "The last update timestamp",
            },
          },
        },
        CartItem: {
          type: "object",
          required: ["product_id", "quantity"],
          properties: {
            id: {
              type: "integer",
              description: "The cart item id",
            },
            cart_id: {
              type: "integer",
              description: "The cart id",
            },
            product_id: {
              type: "integer",
              description: "The product id",
            },
            quantity: {
              type: "integer",
              description: "The quantity of the product",
            },
          },
        },
        Order: {
          type: "object",
          required: ["user_id", "total_amount", "shipping_address"],
          properties: {
            id: {
              type: "integer",
              description: "The order id",
            },
            user_id: {
              type: "integer",
              description: "The user id",
            },
            total_amount: {
              type: "number",
              format: "float",
              description: "The total amount of the order",
            },
            shipping_address: {
              type: "string",
              description: "The shipping address",
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ],
              description: "The order status",
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"], // Path to the API routes
};

// Generate Swagger specification
const swaggerSpec = swaggerJSDoc(options);

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/carts");
const orderRoutes = require("./routes/orders");
const reviewRoutes = require("./routes/reviews");

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);

// Error handling middleware
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to E-commerce API" });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Serve Swagger JSON
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs/`);
});
