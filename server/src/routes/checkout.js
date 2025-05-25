const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Cart = require("../models/Cart");
const Order = require("../models/Order");

router.post("/", async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const amount = cart.items.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    const paymentIndent = await stripe.paymentIndents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.CLIENT_URL}/checkout/success`,
    });

    const order = new Order({
      user: userId,
      items: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      totalAmount: amount,
      paymentIndentId: paymentIndent.id,
      status: "completed",
    });

    await order.save();

    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      orderId: order._id,
      clientSecret: paymentIndent.client_secret,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      message: error.message || "An error occurred during checkout",
    });
  }
});

module.exports = router;
