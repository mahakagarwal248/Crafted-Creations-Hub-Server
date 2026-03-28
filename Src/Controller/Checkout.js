import nodemailer from 'nodemailer';

const TO_EMAIL = ['mahakagarwal248@gmail.com', 'gauriagarwal248@gmail.com'];

function buildEmailHtml(name, phone, email, cartItems, totalAmount) {
  const rows = cartItems
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>₹${i.price}</td><td>${i.quantity}</td><td>₹${(i.price * i.quantity).toFixed(2)}</td></tr>`
    )
    .join('');
  return `
    <h2>New checkout request</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Email:</strong> ${email}</p>
    <h3>Cart items</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
      <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Total amount to pay: ₹${Number(totalAmount).toFixed(2)}</strong></p>
  `;
}

export const sendCheckoutEmail = async (req, res) => {
  try {
    const { name, phone, address, cartItems, totalAmount } = req.body;
    if (!name || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Name, phone and email are required.' });
    }
    const items = Array.isArray(cartItems) ? cartItems : [];
    const total = totalAmount != null ? totalAmount : 0;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({
        success: false,
        message: 'Email is not configured. Set EMAIL_USER and EMAIL_PASS in server .env (e.g. Gmail app password).',
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@example.com',
      to: TO_EMAIL,
      subject: `Checkout request from ${name}`,
      html: buildEmailHtml(name, phone, address, items, total),
      text: `Name: ${name}\nPhone: ${phone}\nAddress: ${address}\n\nCart:\n${items.map((i) => `${i.name} x ${i.quantity} = ₹${i.price * i.quantity}`).join('\n')}\n\nTotal: ₹${total.toFixed(2)}`,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('sendCheckoutEmail:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email.',
    });
  }
};
