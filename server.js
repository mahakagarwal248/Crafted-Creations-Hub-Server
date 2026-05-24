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
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (declare BEFORE routes / listen so order is deterministic).
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (optional - frontend like index.html, css, js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", router);

app.get("/", (_req, res) => {
  res.send("Hello, Node.js app with MongoDB is running!");
});

app.get("/api/test", async (_req, res) => {
  res.json({ status: "success", db: mongoose.connection.readyState });
});

// Start listening immediately so the API is reachable even if Mongo is slow
// to connect. Requests that need the DB will just wait on Mongoose's buffer.
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Connect to MongoDB and run startup sync tasks in the background.
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myapp";

mongoose
  .connect(MONGO_URI)
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
  })
  .catch((err) => {
    // Don't kill the process — keep serving non-DB routes and let Mongoose
    // retry the connection in the background.
    console.error("❌ MongoDB connection error:", err?.message || err);
  });

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected — Mongoose will keep trying to reconnect.");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔁 MongoDB reconnected.");
});
