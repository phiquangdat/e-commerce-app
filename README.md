# E-commerce REST API

A fully-featured e-commerce REST API built with Express, Node.js, and PostgreSQL.

## Features

- User authentication (register/login)
- Product management (CRUD operations)
- Shopping cart functionality
- Order management
- Swagger API documentation

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd e-commerce-app
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
```

4. Create the database:

```bash
createdb ecommerce_db
```

5. Run database migrations:

```bash
npm run migrate
```

6. Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

Once the server is running, you can access the Swagger documentation at:
`http://localhost:3000/api-docs`

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot reload
- `npm test`: Run tests
- `npm run migrate`: Run database migrations

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── db/            # Database setup and migrations
├── middleware/    # Custom middleware
├── models/        # Database models
├── routes/        # API routes
├── utils/         # Utility functions
└── index.js       # Application entry point
```
