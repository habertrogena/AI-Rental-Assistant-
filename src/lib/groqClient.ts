import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";

// 👇 Ensure your GROQ_API_KEY is loaded and valid
const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  throw new Error("❌ GROQ_API_KEY is missing in .env");
}

// 👇 Create Groq client explicitly with baseURL override
export const groq = new OpenAI({
  apiKey: groqApiKey,
  baseURL: "https://api.groq.com/openai/v1", // ✅ Required for Groq
});
