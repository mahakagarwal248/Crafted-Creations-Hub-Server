// server.js
import express from "express";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";
import router from "./Src/Routes/index.js"; // add `.js` for ES modules
import { syncProductIdCounterFromProducts } from "./Src/Utils/syncProductIdCounter.js";
import { syncInvoiceCounterFromInvoices } from "./Src/Utils/invoiceCounter.js";
import { migrateLegacyProductCategories } from "./Src/Utils/productCategories.js";
import { fileURLToPath } from "url";
import morgan from "morgan";
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (larger limit for product photo payloads as base64 JSON)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myapp";

mongoose
  .connect(MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    try {
      await syncProductIdCounterFromProducts();
      console.log("✅ productId counter synced with products");
    } catch (e) {
      console.error("⚠️ productId counter sync failed:", e);
    }
    try {
      const migrated = await migrateLegacyProductCategories();
      if (migrated > 0) {
        console.log(`✅ migrated legacy categories on ${migrated} product(s)`);
      }
    } catch (e) {
      console.error("⚠️ legacy category migration failed:", e);
    }
    try {
      await syncInvoiceCounterFromInvoices();
      console.log("✅ invoice counter synced with invoices");
    } catch (e) {
      console.error("⚠️ invoice counter sync failed:", e);
    }
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Serve static files (optional - frontend like index.html, css, js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(cors())
app.use(morgan('combined'))
app.use('/api', router);

// Basic route
app.get("/", (req, res) => {
  res.send("Hello, Node.js app with MongoDB is running!");
});

// Example API route (to check DB)
app.get("/api/test", async (req, res) => {
  res.json({ status: "success", db: mongoose.connection.readyState });
});

