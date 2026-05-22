import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INVOICES_DIR = path.join(__dirname, "../../uploads/invoices");

function ensureInvoicesDir() {
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true });
  }
}

/**
 * Generate a black-and-white invoice PDF matching the store template layout.
 * @returns {Promise<string>} absolute path to the written PDF file
 */
export function generateInvoicePdf(snapshot) {
  ensureInvoicesDir();

  const fileName = `${snapshot.invoiceNumber}.pdf`;
  const filePath = path.join(INVOICES_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.font("Helvetica-Bold").fontSize(22).text(snapshot.businessName, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).text(snapshot.tagline, { align: "center" });
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Email: ${snapshot.email}`, left);
    doc.text(`Phone: ${snapshot.phone}`, left);
    doc.moveDown(0.5);
    doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(18).text("INVOICE", left);
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Invoice No.: ${snapshot.invoiceNumber}`, left);
    doc.text(`Date: ${snapshot.date}`, left, doc.y - 12, { align: "right", width: pageWidth });
    if (snapshot.orderId != null) {
      doc.text(`Order ID: #${snapshot.orderId}`, left);
    }
    doc.moveDown(1);

    doc.font("Helvetica-BoldOblique").fontSize(11).text("Bill To:", left);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Customer Name: ${snapshot.billTo?.name || "—"}`, left);
    doc.text(`Phone Number: ${snapshot.billTo?.phone || "—"}`, left);
    doc.text(`Address: ${snapshot.billTo?.address || "—"}`, left);
    doc.moveDown(1);

    const tableTop = doc.y;
    const colWidths = [pageWidth * 0.5, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.2];
    const headers = ["Item Description", "Qty", "Price", "Amount"];
    const rowHeight = 22;

    doc.rect(left, tableTop, pageWidth, rowHeight).fill("#e8e8e8").stroke();
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9);
    let x = left + 4;
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop + 6, { width: colWidths[i] - 8, align: i === 0 ? "left" : "center" });
      x += colWidths[i];
    });

    let y = tableTop + rowHeight;
    doc.font("Helvetica").fontSize(9);
    const rows = snapshot.lineItems?.length
      ? snapshot.lineItems
      : [{ description: "—", qty: "", price: "", amount: "" }];

    rows.forEach((row) => {
      doc.rect(left, y, pageWidth, rowHeight).stroke();
      x = left + 4;
      const cells = [
        row.description ?? "",
        row.qty !== "" && row.qty != null ? String(row.qty) : "",
        row.price !== "" && row.price != null ? String(row.price) : "",
        row.amount !== "" && row.amount != null ? String(row.amount) : "",
      ];
      cells.forEach((cell, i) => {
        doc.text(cell, x, y + 6, { width: colWidths[i] - 8, align: i === 0 ? "left" : "center" });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    doc.y = y + 16;
    doc.font("Helvetica-BoldOblique").fontSize(11).text(`Total Amount: ₹${snapshot.totalAmount}`, left);
    doc.moveDown(0.6);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Payment Mode: ${snapshot.paymentMode}`, left);
    doc.text(`Payment Status: ${snapshot.paymentStatus}`, left);
    doc.moveDown(0.8);

    doc.font("Helvetica-BoldOblique").fontSize(11).text("Notes:", left);
    doc.font("Helvetica").fontSize(9);
    (snapshot.notes || []).forEach((note) => {
      doc.text(`• ${note}`, left, doc.y, { width: pageWidth });
    });
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(10).text("Authorized Signature", left);
    doc.moveTo(left, doc.y + 28).lineTo(left + 180, doc.y + 28).stroke();

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
    doc.on("error", reject);
  });
}

export function getInvoicePdfAbsolutePath(invoiceNumber) {
  return path.join(INVOICES_DIR, `${invoiceNumber}.pdf`);
}
