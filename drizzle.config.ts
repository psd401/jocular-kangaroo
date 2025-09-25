import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "aws-data-api",
  dbCredentials: {
    database: process.env.RDS_DATABASE_NAME!,
    resourceArn: process.env.RDS_RESOURCE_ARN!,
    secretArn: process.env.RDS_SECRET_ARN!,
  },
  migrations: {
    table: "drizzle_migrations",
    schema: "public"
  },
  casing: "snake_case", // 🎯 Enable automatic snake_case to camelCase transformation
  verbose: true,
  strict: true
});