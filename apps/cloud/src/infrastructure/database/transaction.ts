
import dotenv from 'dotenv'
import path from "path";

dotenv.config({
    path : path.resolve('../../.env.local')
})

export default {
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL
  },
};