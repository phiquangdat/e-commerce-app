import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./Checkout.css";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: elements.getElement(CardElement),
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      const response = await fetch("http://localhost:3001/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment failed");
      }

      onSuccess(data);
    } catch (err) {
      setError(err.message);
      onError(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="form-row">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button className="payment-button">
        {processing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, loading, error: cartError, clearCart } = useCart();
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderError, setOrderError] = useState(null);

  const calculateTotal = () => {
    return cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const handlePaymentSuccess = async (data) => {
    try {
      await clearCart();
      setOrderComplete(true);
    } catch (err) {
      setOrderError("Failed to clear cart after successfull payment");
    }
  };

  const handlePaymentError = (err) => {
    console.error("Payment error", err);
  };

  if (loading) return <div className="loading">Loading checkout...</div>;

  if (cartError) {
    return <div className="error">Error: {cartError}</div>;
  }

  if (cart.length === 0 && !orderComplete) {
    return (
      <div className="empty-cart">
        <p>Your cart is empty</p>
        <button
          className="continue-shopping-button"
          onClick={() => navigate("/products")}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="order-complete">
        <h2>Thank you for your order!</h2>
        <p>Your order has been placed successfully.</p>
        <button
          className="continue-shopping-button"
          onClick={() => navigate("/products")}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-content">
        <div className="order-summary">
          <h2>Order Summary</h2>
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item._id} className="checkout-item">
                <img src={item.product.image} alt={item.product.name} />
                <div className="item-details">
                  <h3>{item.product.name}</h3>
                  <p>Quantity: {item.quantity}</p>
                  <p>Price: ${item.product.price}</p>
                </div>
                <div className="item-total">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="order-total">
            <div className="total-row">
              <span>Subtotal: </span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Shipping: </span>
              <span>Calculated at checkout</span>
            </div>
            <div className="total-row final">
              <span>Total: </span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-section">
        <h2>Payment Information</h2>
        <Elements stripe={stripePromise}>
          <CheckoutForm
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      </div>
    </div>
  );
};
