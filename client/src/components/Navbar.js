import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../contexts/CartContext";
import "./Navbar.css";
function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { cartItems } = useCart();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-menu">
          <Link to="/products" className="navbar-item">
            Products
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/orders" className="navbar-item">
                Orders
              </Link>
              <Link to="/cart" className="navbar-item cart-link">
                Cart ({cartItems.length})
              </Link>
              <button onClick={logout} className="navbar-item logout-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-item">
                Login
              </Link>
              <Link to="/register" className="navbar-item">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
