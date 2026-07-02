import { drizzle } from "drizzle-orm/node-postgres";
import { createRequire } from "module";
import path from "path";
import * as schema from "@shared/schema";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { Pool } = require("pg") as { Pool: new (config: { connectionString: string; ssl: false | { rejectUnauthorized: boolean } }) => any };

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("helium") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export { pool };
