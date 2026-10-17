import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { errorHandler, notFound } from "./middleware/error.middleware";
import { authLimiter, generalLimiter } from "./middleware/rate-limit";
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
import categoryRoutes from "./routes/category.routes";
import reviewRoutes from "./routes/review.routes";
import paymentRoutes from "./routes/payment.routes";
import cronRoutes from "./routes/cron.routes";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "short" : "dev"));
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-By"],
  })
);

app.use(generalLimiter);
app.use(cookieParser());
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
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cron", cronRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
