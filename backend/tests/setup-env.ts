import { getTestDatabaseUrl } from "./helpers/test-db";

const url = getTestDatabaseUrl();

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.JWT_SECRET = "test_only_not_a_secret_jwt";
process.env.PAYSTACK_SECRET_KEY = "test_only_not_a_secret_paystack";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.API_URL = "http://localhost:5000";
process.env.CRON_SECRET = "test_only_not_a_secret_cron";
process.env.GOOGLE_CLIENT_ID = "test_only_not_a_client_id";
process.env.GOOGLE_CLIENT_SECRET = "test_only_not_a_secret_google";
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_ANON_KEY = "test_only_not_a_key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test_only_not_a_key";
