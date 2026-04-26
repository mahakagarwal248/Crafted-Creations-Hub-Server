import nodemailer from 'nodemailer';

const TO_EMAIL = ['mahakagarwal248@gmail.com', 'gauriagarwal248@gmail.com'];

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(name, phone, shippingLines, cartItems, totalAmount) {
  const rows = cartItems
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.name)}</td><td>₹${i.price}</td><td>${i.quantity}</td><td>₹${(i.price * i.quantity).toFixed(2)}</td></tr>`
    )
    .join('');
  const shipBlock = shippingLines
    .map((line) => `<p>${escapeHtml(line.label)}: ${escapeHtml(line.value)}</p>`)
    .join('');
  return `
    <h2>New checkout request</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <h3>Shipping address</h3>
    ${shipBlock}
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
    const { name, phone, streetAddress, city, state, pincode, address, cartItems, totalAmount } = req.body;
    const street = String(streetAddress ?? address ?? '').trim();
    const cityT = String(city ?? '').trim();
    const stateT = String(state ?? '').trim();
    const pinT = String(pincode ?? '').trim();
    if (!String(name ?? '').trim() || !String(phone ?? '').trim()) {
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }
    if (!street || !cityT || !stateT || !pinT) {
      return res.status(400).json({
        success: false,
        message: 'Street address, city, state and PIN code are required.',
      });
    }
    const items = Array.isArray(cartItems) ? cartItems : [];
    const total = totalAmount != null ? totalAmount : 0;

    const shippingLines = [
      { label: 'Street address', value: street },
      { label: 'City', value: cityT },
      { label: 'State', value: stateT },
      { label: 'PIN code', value: pinT },
    ];

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

    const textAddress = `Street: ${street}\nCity: ${cityT}\nState: ${stateT}\nPIN: ${pinT}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@example.com',
      to: TO_EMAIL,
      subject: `Checkout request from ${name}`,
      html: buildEmailHtml(name, phone, shippingLines, items, total),
      text: `Name: ${name}\nPhone: ${phone}\n${textAddress}\n\nCart:\n${items.map((i) => `${i.name} x ${i.quantity} = ₹${i.price * i.quantity}`).join('\n')}\n\nTotal: ₹${total.toFixed(2)}`,
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
