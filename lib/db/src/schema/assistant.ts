import { pgTable, serial, text, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  caseId: integer("case_id"),
  title: text("title").notNull().default("Coverage Question"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationMessagesTable = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  sources: text("sources").array(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }),
  refused: boolean("refused").notNull().default(false),
  refusalReason: text("refusal_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeDocumentsTable = pgTable("knowledge_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  chunkCount: integer("chunk_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeChunksTable = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(conversationMessagesTable).omit({ id: true, createdAt: true });
export const insertKnowledgeDocSchema = createInsertSchema(knowledgeDocumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChunkSchema = createInsertSchema(knowledgeChunksTable).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertKnowledgeDoc = z.infer<typeof insertKnowledgeDocSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
export type ConversationMessage = typeof conversationMessagesTable.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocumentsTable.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunksTable.$inferSelect;
