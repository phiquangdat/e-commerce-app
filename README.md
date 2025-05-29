# E-Commerce Application

A full-stack e-commerce application built with React, Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Product browsing and searching
- Shopping cart functionality
- Secure checkout with Stripe
- Order history and tracking
- Responsive design

## Deployment Instructions

### Prerequisites

1. Create a Render account at https://render.com
2. Set up a MongoDB database (MongoDB Atlas recommended)
3. Create a Stripe account for payment processing

### Environment Variables

#### Backend (.env)

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NODE_ENV=production
```

#### Frontend (.env)

```
REACT_APP_API_URL=https://your-backend-url.onrender.com
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### Deployment Steps

1. Fork and clone this repository
2. Push your code to GitHub
3. In Render:
   - Create a new Web Service
   - Connect your GitHub repository
   - Select the root directory
   - Choose Node.js as the runtime
   - Add the environment variables
   - Deploy!

### Manual Deployment

1. Backend:

   ```bash
   cd server
   npm install
   npm start
   ```

2. Frontend:
   ```bash
   cd client
   npm install
   npm run build
   npm start
   ```

## Development

1. Clone the repository
2. Install dependencies:

   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Start development servers:

   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend server
   cd ../client
   npm start
   ```

## Technologies Used

- Frontend:

  - React
  - React Router
  - Stripe.js
  - CSS3

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Mongoose
  - JWT Authentication
  - Stripe API

## License

MIT
