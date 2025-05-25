import React from "react";
import { Link } from "react-router-dom";
import "./Product.css";

export default function Product({ product }) {
  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <p className="product-price">${product.price}</p>
      </div>
    </Link>
  );
}
