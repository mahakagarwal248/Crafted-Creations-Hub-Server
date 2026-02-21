// server.js
import express from "express";
import mongoose from "mongoose";
import path from "path";
import dotenv from "dotenv";
import router from "./Src/Routes/index.js"; // add `.js` for ES modules
import { fileURLToPath } from "url";
import morgan from "morgan";
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/myapp";

mongoose
  .connect(MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Serve static files (optional - frontend like index.html, css, js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(cors())
app.use('/api', router);
app.use(morgan('combined'))

// Basic route
app.get("/", (req, res) => {
  res.send("Hello, Node.js app with MongoDB is running!");
});

// Example API route (to check DB)
app.get("/api/test", async (req, res) => {
  res.json({ status: "success", db: mongoose.connection.readyState });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
