import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    JWT_SECRET: z.string().min(32),
    CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  })
  .parse(process.env);
