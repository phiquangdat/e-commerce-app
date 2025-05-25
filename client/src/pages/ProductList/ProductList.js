import React from "react";
import Product from "../Product/Product";
import "./ProductList.css";

export default function ProductList({ products }) {
  return (
    <div className="product-list">
      {products.map((product) => (
        <Product key={product.id} product={product} />
      ))}
    </div>
  );
}
