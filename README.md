# E-Commerce Application

A full-stack e-commerce application with React frontend and Node.js backend.

## Project Structure

```
e-commerce-app/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/               # React source files
│       ├── components/    # Reusable components
│       ├── pages/         # Page components
│       └── App.js         # Main App component
│
└── server/                # Node.js backend
    ├── src/
    │   ├── config/       # Configuration files
    │   ├── controllers/  # Route controllers
    │   ├── middleware/   # Custom middleware
    │   ├── models/       # Database models
    │   ├── routes/       # API routes
    │   └── utils/        # Utility functions
    └── .env              # Environment variables
```

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

   ```
   PORT=5000
   NODE_ENV=development
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=ecommerce
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   CLIENT_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:

   ```bash
   cd client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Features

- User authentication (email/password, Google, Facebook)
- Product browsing and search
- Shopping cart functionality
- Order management
- User profile management

## Technologies Used

### Frontend

- React
- React Router
- Axios
- CSS3

### Backend

- Node.js
- Express
- PostgreSQL
- Passport.js
- JWT Authentication
- OAuth 2.0

## Development

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:3000
- API documentation available at: http://localhost:5000/api-docs
