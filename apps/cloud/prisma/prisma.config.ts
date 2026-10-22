
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Location of the Prisma schema
  schema: "./prisma/schema.prisma",

  // Database migration configuration
  migrations: {
    path: "./prisma/migrations",
  },

  // Database connection configuration
  datasource: {
    url: env("DATABASE_URL"),
  },
});
