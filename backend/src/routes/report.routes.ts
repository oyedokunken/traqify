import { Router } from "express";
import { getOverview, getSalesReport, getTopProducts, getRevenueChart, getCustomerChart, downloadReport, emailReport } from "../controllers/report.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isAtLeastAuditor } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg, isAtLeastAuditor);

router.get("/overview", getOverview);
router.get("/sales", getSalesReport);
router.get("/top-products", getTopProducts);
router.get("/revenue-chart", getRevenueChart);
router.get("/customer-chart", getCustomerChart);
router.get("/:type/pdf", downloadReport);
router.post("/:type/email", emailReport);

export default router;
