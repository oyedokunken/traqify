import { logAndIgnore } from "./config/logger";
import "./config/load-env";
import app from "./app";
import { logger } from "./config/logger";
import { processWishlistEmails } from "./controllers/store.controller";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, "Traqify API started");
  // Wishlist reminder job - runs every 5 minutes
  setInterval(() => { processWishlistEmails().catch(logAndIgnore("Wishlist job error")); }, 5 * 60 * 1000);
});

export default app;
