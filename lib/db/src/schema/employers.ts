import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employersTable = pgTable("employers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployerSchema = createInsertSchema(employersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployer = z.infer<typeof insertEmployerSchema>;
export type Employer = typeof employersTable.$inferSelect;
