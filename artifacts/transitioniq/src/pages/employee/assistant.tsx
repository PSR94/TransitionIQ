import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ProtectedRoute } from "@/lib/auth";
import { Send, Loader2, MessageSquare, Compass, User, AlertTriangle, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sources?: { documentId: number; title: string; excerpt: string }[];
  refused?: boolean;
  refusalReason?: string | null;
}

interface ChatResponse {
  conversationId: number;
  message: string;
  sources: { documentId: number; title: string; excerpt: string }[];
  confidenceScore: number;
  refused: boolean;
  refusalReason: string | null;
}

const SUGGESTED = [
  "How long do I have to elect COBRA?",
  "What's the difference between a gold and silver ACA plan?",
  "How do I qualify for a Special Enrollment Period?",
  "How does an HSA work?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your TransitionIQ Coverage Guide. I'm an AI assistant trained on COBRA regulations, ACA marketplace rules, and healthcare basics to help you navigate your transition.\n\nWhat questions do you have about your coverage options?",
    },
  ]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const r = await api.post<ChatResponse>("/assistant/chat", { message: msg, conversationId: convId });
      if (!convId) setConvId(r.conversationId);
      setMessages(prev => [...prev, {
        role: "assistant", content: r.message,
        sources: r.sources, refused: r.refused, refusalReason: r.refusalReason,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "I'm temporarily unavailable. Please try again later." }]);
    }
    setLoading(false);
  };

  return (
    <ProtectedRoute allowedRoles={["employee", "consultant", "admin"]}>
      <DashboardLayout>
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto bg-card rounded-3xl border border-card-border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border/50 bg-secondary/5 shrink-0 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-inner shadow-primary/20">
              <Compass className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Coverage Guide</h1>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">AI-Powered Educational Assistant</p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${msg.role === "assistant" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-secondary/20"}`}>
                    {msg.role === "assistant" ? <Compass className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  
                  <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`px-5 py-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user" 
                        ? "bg-secondary text-secondary-foreground rounded-tr-sm shadow-sm" 
                        : msg.refused 
                          ? "bg-accent/10 border border-accent/20 text-foreground rounded-tl-sm" 
                          : "bg-card border border-card-border shadow-sm rounded-tl-sm text-foreground font-medium"
                    }`}>
                      {msg.refused && (
                        <div className="flex items-center gap-2 mb-3 text-accent text-xs font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4" />
                          Outside Guidance Scope
                        </div>
                      )}
                      {msg.content}
                    </div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.sources.map((s, si) => (
                          <div key={si} className="inline-flex items-center gap-1.5 bg-secondary/10 border border-border/50 text-muted-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg">
                            <BookOpen className="w-3.5 h-3.5 opacity-70" />
                            {s.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="bg-card border border-card-border shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 bg-card border-t border-card-border p-4 sm:p-6">
            {/* Suggested Chips */}
            {messages.length <= 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {SUGGESTED.map(q => (
                  <button 
                    key={q} 
                    onClick={() => sendMessage(q)} 
                    className="text-xs font-medium bg-background border border-border hover:border-primary hover:text-primary text-muted-foreground rounded-full px-4 py-2 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="relative flex items-end gap-3 bg-background border-2 border-border/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl p-2 transition-all">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask about COBRA, ACA, or transition planning..."
                disabled={loading}
                rows={1}
                className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-[15px] font-medium p-3 custom-scrollbar"
                style={{ height: "auto" }}
              />
              <button 
                onClick={() => sendMessage()} 
                disabled={!input.trim() || loading}
                className="w-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition-all shadow-md shadow-primary/20 disabled:shadow-none mb-0.5"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
              </button>
            </div>
            <div className="text-center mt-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Educational guidance only · Not insurance advice
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
