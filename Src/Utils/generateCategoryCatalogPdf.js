import PDFDocument from "pdfkit";

const SUPPORTED_IMAGE_MIME = /^image\/(jpeg|jpg|png)$/i;

function dataUrlToImageBuffer(value) {
  if (typeof value !== "string") return null;
  const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/i.exec(value);
  if (!match) return null;
  if (!SUPPORTED_IMAGE_MIME.test(match[1])) return null;
  try {
    return Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
}

function pickProductImage(product) {
  if (Array.isArray(product?.photos)) {
    for (const photo of product.photos) {
      const buf = dataUrlToImageBuffer(photo);
      if (buf) return buf;
    }
  }
  const fallback = dataUrlToImageBuffer(product?.imageUrl);
  if (fallback) return fallback;
  return null;
}

function safeString(value, fallback = "—") {
  if (value == null) return fallback;
  const str = String(value).trim();
  return str ? str : fallback;
}

/**
 * Streams a "category catalogue" PDF to the given Node response stream.
 * - showStartingFrom: when true, prices are prefixed with "Starting from".
 */
export function streamCategoryCatalogPdf({
  res,
  category,
  products,
  generatedOn,
  showStartingFrom = false,
}) {
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  doc.font("Helvetica-Bold").fontSize(22).text("Crafted Creations Hub", { align: "center" });
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(12).text("Product Catalogue", { align: "center" });
  doc.moveDown(0.6);
  doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke();
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(16).text(`Category: ${safeString(category?.name, "—")}`, left);
  if (category?.description) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Oblique").fontSize(10).fillColor("#555555")
      .text(category.description, left, doc.y, { width: pageWidth });
    doc.fillColor("#000000");
  }
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#555555")
    .text(`Generated on ${generatedOn}`, left);
  doc.text(`Total products: ${products.length}`, left);
  doc.fillColor("#000000");
  doc.moveDown(0.8);

  if (!products.length) {
    doc.font("Helvetica-Oblique").fontSize(11).fillColor("#777777")
      .text("There are no products in this category yet.", left, doc.y, { width: pageWidth });
    doc.end();
    return;
  }

  const cardGap = 14;
  const imageSize = 110;
  const textLeft = left + imageSize + 16;
  const textWidth = pageWidth - imageSize - 16;
  const minCardHeight = imageSize + 10;

  const pageBottom = () => doc.page.height - doc.page.margins.bottom;

  const ensureSpace = (needed) => {
    if (doc.y + needed > pageBottom()) {
      doc.addPage();
    }
  };

  products.forEach((product, index) => {
    const name = safeString(product?.name, "Unnamed product");
    const description = safeString(product?.description, "");
    const price = product?.price != null ? `₹${product.price}` : "—";
    const dispatchVal =
      product?.minDaysToDispatch != null
        ? `${product.minDaysToDispatch} day${product.minDaysToDispatch === 1 ? "" : "s"}`
        : "—";

    doc.font("Helvetica").fontSize(10);
    const descHeight = description
      ? doc.heightOfString(description, { width: textWidth })
      : 0;

    const cardHeight = Math.max(minCardHeight, descHeight + 70);
    ensureSpace(cardHeight + cardGap);

    const cardTop = doc.y;

    const imageBuffer = pickProductImage(product);
    if (imageBuffer) {
      try {
        doc.image(imageBuffer, left, cardTop, {
          fit: [imageSize, imageSize],
          align: "center",
          valign: "center",
        });
      } catch {
        doc.rect(left, cardTop, imageSize, imageSize).stroke("#dddddd");
        doc.font("Helvetica-Oblique").fontSize(9).fillColor("#999999")
          .text("Image unavailable", left, cardTop + imageSize / 2 - 6, {
            width: imageSize,
            align: "center",
          });
        doc.fillColor("#000000");
      }
    } else {
      doc.rect(left, cardTop, imageSize, imageSize).stroke("#dddddd");
      doc.font("Helvetica-Oblique").fontSize(9).fillColor("#999999")
        .text("No image", left, cardTop + imageSize / 2 - 6, {
          width: imageSize,
          align: "center",
        });
      doc.fillColor("#000000");
    }

    let cursorY = cardTop;

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#1a1a1a")
      .text(name, textLeft, cursorY, { width: textWidth });
    cursorY = doc.y + 2;

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#a17a2a")
      .text(`${showStartingFrom ? "Starting from " : ""}${price}`, textLeft, cursorY, {
        width: textWidth,
      });
    cursorY = doc.y + 2;
    doc.fillColor("#000000");

    doc.font("Helvetica").fontSize(10).fillColor("#444444")
      .text(`Min dispatch time: ${dispatchVal}`, textLeft, cursorY, { width: textWidth });
    cursorY = doc.y + 4;
    doc.fillColor("#000000");

    if (description) {
      doc.font("Helvetica").fontSize(10).fillColor("#333333")
        .text(description, textLeft, cursorY, { width: textWidth });
      doc.fillColor("#000000");
    }

    const bottomOfCard = Math.max(doc.y, cardTop + imageSize);
    doc.y = bottomOfCard + cardGap;

    if (index < products.length - 1) {
      doc.moveTo(left, doc.y - cardGap / 2)
        .lineTo(left + pageWidth, doc.y - cardGap / 2)
        .strokeColor("#eeeeee")
        .stroke();
      doc.strokeColor("#000000");
    }
  });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const footerY = doc.page.height - doc.page.margins.bottom + 12;
    doc.font("Helvetica").fontSize(8).fillColor("#888888")
      .text(`Page ${i - range.start + 1} of ${range.count}`, left, footerY, {
        width: pageWidth,
        align: "center",
      });
    doc.fillColor("#000000");
  }

  doc.end();
}
