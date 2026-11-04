import "./config/load-env";
import app from "./app";
import { logger } from "./config/logger";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, "Traqify API started");
});

export default app;
