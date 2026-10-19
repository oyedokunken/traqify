import "./config/load-env";
import app from "./app";
import { processWishlistEmails } from "./controllers/store.controller";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Traqify API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  // Wishlist reminder job - runs every 5 minutes
  setInterval(() => { processWishlistEmails().catch((e) => console.error("Wishlist job error:", e)); }, 5 * 60 * 1000);
});

export default app;
