import moment from "moment";

export const INVOICE_BUSINESS = {
  businessName: "CRAFTED CREATIONS HUB",
  tagline: "Handmade Decor & Customized Gifts",
  email: "craftedcreationsstore@gmail.com",
  phone: "8941022212",
};

export const INVOICE_NOTES = [
  "Customized products are non-returnable.",
  "Seller is not registered under GST.",
  "Thank you for supporting small businesses.",
];

function formatAddress(addr) {
  if (!addr || typeof addr !== "object") return "";
  const parts = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean);
  return parts.join(", ");
}

function mapPaymentMode(method) {
  const m = String(method || "").toUpperCase();
  if (m === "CASH") return "Cash";
  if (m === "UPI") return "UPI";
  if (m === "CARD" || m === "PAYPAL") return "Bank Transfer";
  return "UPI / Cash / Bank Transfer";
}

function resolvePaymentStatus(order) {
  const pending = Number(order.pendingAmount) || 0;
  const paidStatus = String(order.payment?.status || "").toUpperCase();
  if (pending <= 0 || paidStatus === "PAID") return "Paid";
  return "Pending";
}

/**
 * Build printable invoice snapshot from an order and optional customer user doc.
 */
export function buildInvoiceSnapshot(order, customer, { invoiceNumber, generatedAt = new Date() } = {}) {
  const lineItems = (order.items || []).map((item) => ({
    description: item.name,
    qty: item.quantity ?? 0,
    price: Number(item.price) || 0,
    amount: Number(item.amountPayable) || 0,
  }));

  const totalAmount =
    lineItems.reduce((sum, row) => sum + row.amount, 0) ||
    Number(order.amountPayable) ||
    Number(order.totalAmount) ||
    0;

  const billTo = {
    name: customer?.name || "—",
    phone: customer?.phone != null ? String(customer.phone) : "—",
    address: formatAddress(order.shippingAddress) || formatAddress(customer?.shippingAddress) || "—",
  };

  return {
    ...INVOICE_BUSINESS,
    invoiceNumber,
    date: moment(generatedAt).format("DD/MM/YYYY"),
    orderId: order.orderId,
    billTo,
    lineItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMode: mapPaymentMode(order.payment?.method),
    paymentStatus: resolvePaymentStatus(order),
    notes: [...INVOICE_NOTES],
  };
}
