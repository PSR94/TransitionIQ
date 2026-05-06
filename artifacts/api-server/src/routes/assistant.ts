import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conversationsTable, conversationMessagesTable, knowledgeChunksTable, knowledgeDocumentsTable } from "@workspace/db";
import { requireAuth, requireRole, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { getOpenAIClient } from "../lib/openai";

const router = Router();
router.use("/assistant", requireAuth, requireRole("employee", "admin", "consultant"));

const UNSAFE_TOPICS = [
  "legal advice", "medical advice", "guarantee", "definitely covered", "hipaa compliance",
  "sue", "lawsuit", "prescription recommendation", "diagnos", "treatment", "specific medication",
];

const SYSTEM_PROMPT = `You are Coverage Guide, a helpful and privacy-aware healthcare benefits education assistant for TransitionIQ Health. You help departing employees understand their healthcare coverage options during employment transitions.

You can explain:
- COBRA continuation coverage basics, costs, and timelines
- ACA Marketplace plans, metal tiers, and enrollment periods
- Special Enrollment Periods (SEPs) and qualifying life events
- Medicare transition basics for those approaching eligibility
- Plan terminology: deductibles, premiums, out-of-pocket maximums, copays, coinsurance
- How to compare plans and what to look for
- Employer healthcare transition stipends and how they work
- General guidance on what to verify before enrolling in a plan

Rules you must always follow:
1. Do NOT provide legal advice, tax advice, or specific medical advice
2. Do NOT guarantee a person's eligibility for any plan or subsidy
3. Do NOT claim any plan is "definitely the best" for the user
4. Do NOT expose or reference any employer-sensitive or employee-specific health data
5. ALWAYS recommend that users verify information through official plan sources (healthcare.gov, plan websites, or licensed professionals)
6. If asked about legal compliance, specific tax implications, or medical treatment, give educational context and recommend professional consultation
7. Keep responses concise, clear, and jargon-free
8. Cite the knowledge base when relevant by mentioning the topic area

You are educational only. You are not a licensed insurance broker or healthcare provider.`;

function detectUnsafeQuery(message: string): { unsafe: boolean; reason?: string } {
  const lower = message.toLowerCase();
  for (const topic of UNSAFE_TOPICS) {
    if (lower.includes(topic)) {
      return { unsafe: true, reason: `Questions about ${topic} require professional guidance beyond this educational assistant.` };
    }
  }
  return { unsafe: false };
}

async function retrieveRelevantChunks(query: string): Promise<Array<{ documentId: number; title: string; excerpt: string }>> {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const docs = await db.select().from(knowledgeDocumentsTable).limit(8);
  const chunks = await db.select().from(knowledgeChunksTable).limit(20);

  const scored = chunks.map(chunk => {
    const content = chunk.content.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (content.includes(word)) score++;
    }
    return { chunk, score };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  return scored.map(({ chunk }) => {
    const doc = docs.find(d => d.id === chunk.documentId);
    return {
      documentId: chunk.documentId,
      title: doc?.title ?? "Coverage Guide",
      excerpt: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? "..." : ""),
    };
  });
}

router.post("/assistant/chat", async (req, res) => {
  const user = getUser(req);
  const { message, conversationId } = req.body as { message: string; conversationId?: number };

  if (!message?.trim()) {
    res.status(400).json({ error: "Bad Request", message: "Message is required" });
    return;
  }

  const safetyCheck = detectUnsafeQuery(message);
  if (safetyCheck.unsafe) {
    let convId = conversationId;
    if (!convId) {
      const [conv] = await db.insert(conversationsTable).values({ userId: user.id, title: message.slice(0, 50) }).returning();
      convId = conv.id;
    }
    await db.insert(conversationMessagesTable).values([
      { conversationId: convId, role: "user", content: message, sources: [], refused: false },
      {
        conversationId: convId, role: "assistant",
        content: `I'm not able to provide ${safetyCheck.reason} I'm here for educational purposes only and cannot provide legal, tax, or specific medical advice. I recommend consulting with a licensed insurance broker, healthcare attorney, or your HR department for this type of question. Is there anything else about general coverage concepts I can help explain?`,
        sources: [], confidenceScore: "0.95", refused: true, refusalReason: safetyCheck.reason,
      }
    ]);
    await logAudit(user, "assistant.refused", "conversation", convId, safetyCheck.reason);
    res.json({ conversationId: convId, message: `I'm not able to provide ${safetyCheck.reason} I recommend consulting with a licensed professional. Is there anything about general coverage concepts I can help explain?`, sources: [], confidenceScore: 0.95, refused: true, refusalReason: safetyCheck.reason });
    return;
  }

  const sources = await retrieveRelevantChunks(message);
  let convId = conversationId;
  if (!convId) {
    const [conv] = await db.insert(conversationsTable).values({ userId: user.id, title: message.slice(0, 60) }).returning();
    convId = conv.id;
  }

  const history = convId ? await db.select().from(conversationMessagesTable).where(eq(conversationMessagesTable.conversationId, convId)).orderBy(conversationMessagesTable.createdAt).limit(10) : [];
  await db.insert(conversationMessagesTable).values({ conversationId: convId, role: "user", content: message, sources: [] });

  const contextText = sources.length > 0
    ? `\n\nRelevant knowledge base context:\n${sources.map(s => `[${s.title}]: ${s.excerpt}`).join("\n\n")}`
    : "";

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT + contextText },
    ...history.slice(-6).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message },
  ];

  try {
    const openai = getOpenAIClient();
    if (!openai) {
      throw new Error("Optional conversational adapter is not configured");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages,
    });
    const assistantMessage = response.choices[0]?.message?.content ?? "I'm unable to answer that at this moment. Please try again or consult your benefits resources.";
    const confidence = 0.82;

    await db.insert(conversationMessagesTable).values({
      conversationId: convId, role: "assistant", content: assistantMessage,
      sources: sources.map(s => s.title), confidenceScore: confidence.toFixed(2), refused: false,
    });
    await logAudit(user, "assistant.chat", "conversation", convId);
    res.json({ conversationId: convId, message: assistantMessage, sources, confidenceScore: confidence, refused: false, refusalReason: null });
  } catch {
    const fallback = "The optional conversational adapter is not configured. For immediate assistance, review the educational resources in your transition portal, or contact your benefits consultant directly.";
    await db.insert(conversationMessagesTable).values({ conversationId: convId, role: "assistant", content: fallback, sources: [], refused: false });
    res.json({ conversationId: convId, message: fallback, sources: [], confidenceScore: 0.5, refused: false, refusalReason: null });
  }
});

router.get("/assistant/conversations", async (req, res) => {
  const user = getUser(req);
  const convs = await db.select().from(conversationsTable).where(eq(conversationsTable.userId, user.id)).orderBy(desc(conversationsTable.updatedAt)).limit(20);
  const result = await Promise.all(convs.map(async c => {
    const msgs = await db.select().from(conversationMessagesTable).where(eq(conversationMessagesTable.conversationId, c.id));
    const last = msgs[msgs.length - 1];
    return { id: c.id, title: c.title, messageCount: msgs.length, lastMessageAt: (last?.createdAt ?? c.createdAt).toISOString() };
  }));
  res.json({ conversations: result });
});

router.get("/assistant/conversations/:conversationId", async (req, res) => {
  const user = getUser(req);
  const { conversationId } = req.params;
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, parseInt(conversationId)));
  if (!conv || conv.userId !== user.id) { res.status(404).json({ error: "Not Found" }); return; }
  const msgs = await db.select().from(conversationMessagesTable).where(eq(conversationMessagesTable.conversationId, conv.id)).orderBy(conversationMessagesTable.createdAt);
  res.json({
    id: conv.id, title: conv.title,
    messages: msgs.map(m => ({
      id: m.id, role: m.role, content: m.content,
      sources: (m.sources ?? []).map((title, i) => ({ documentId: i + 1, title, excerpt: "" })),
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

export default router;
