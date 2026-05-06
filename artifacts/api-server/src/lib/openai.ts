import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-...") {
    return null;
  }

  client ??= new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  return client;
}
