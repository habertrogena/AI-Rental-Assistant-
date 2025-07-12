import { groq } from "../lib/groqClient";

export async function askGroq(question: string, context: string) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `You are a rental assistant AI helping a landlord analyze tenant data. Use this context:\n${context}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message?.content?.trim() || "No answer found.";
  } catch (err: any) {
    console.error("GPT error:", err);
    if (err.message?.includes("Request too large")) {
      return "⚠️ Your data is too large. Try uploading fewer records or summarizing the file.";
    }
    return "❌ Sorry, I could not process that question right now.";
  }
}
