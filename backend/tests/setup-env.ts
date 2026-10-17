import { getTestDatabaseUrl } from "./helpers/test-db";

const url = getTestDatabaseUrl();

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.JWT_SECRET = "test-jwt-secret-not-for-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";
process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.API_URL = "http://localhost:5000";
process.env.CRON_SECRET = "test-cron-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
