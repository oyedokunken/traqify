import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import orgRoutes from "./routes/org.routes";
import productRoutes from "./routes/product.routes";
import inventoryRoutes from "./routes/inventory.routes";
import orderRoutes from "./routes/order.routes";
import customerRoutes from "./routes/customer.routes";
import staffRoutes from "./routes/staff.routes";
import reportRoutes from "./routes/report.routes";
import auditRoutes from "./routes/audit.routes";
import newsletterRoutes from "./routes/newsletter.routes";
import storeRoutes from "./routes/store.routes";
import { processWishlistEmails } from "./controllers/store.controller";
import categoryRoutes from "./routes/category.routes";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(morgan("combined"));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({ service: "Traqify API", status: "ok", version: "1.0.0", docs: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), service: "Traqify API" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/org", orgRoutes);
app.use("/api/organizations", orgRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/store", storeRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Traqify API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  // Wishlist reminder job - runs every 5 minutes
  setInterval(() => { processWishlistEmails().catch((e) => console.error("Wishlist job error:", e)); }, 5 * 60 * 1000);
});

export default app;
