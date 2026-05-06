import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/transitioniq";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
