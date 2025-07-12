import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";

import { parseRentalExcel } from "../parser/excelParser";
import { askGroq } from "../ai/askgrok";
import { setRentalData, getRentalData } from "../data/rentalMemory";
import { sendSafeMessage } from "../utils/sendSafeMessage";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start((ctx) => {
  ctx.reply(
    `👋 Hello ${ctx.from.first_name}!\nWelcome to the Rental AI Assistant.\n\n📄 Please upload your Excel file to begin.`
  );
});

// 📄 Handle Excel file upload
bot.on("document", async (ctx) => {
  const file = ctx.message.document;

  if (!file.file_name?.endsWith(".xlsx")) {
    return ctx.reply("⚠️ Please upload a valid Excel (.xlsx) file.");
  }

  try {
    const fileId = file.file_id;
    const fileLink = await bot.telegram.getFileLink(fileId);

    const uploadPath = path.join(__dirname, "../../uploads/latest.xlsx");
    const response = await axios.get(fileLink.href, { responseType: "stream" });

    const writer = fs.createWriteStream(uploadPath);
    response.data.pipe(writer);

    writer.on("finish", async () => {
      ctx.reply("📊 Excel file received. Parsing data...");

      try {
        const parsedData = await parseRentalExcel(uploadPath);

        if (!parsedData.length) {
          return ctx.reply(
            "⚠️ No valid rental entries found in the Excel file."
          );
        }

        setRentalData(parsedData); // Store parsed data in memory

        // 🧪 Add debug info about estates and sample data
        const estates = [...new Set(parsedData.map((r) => r.estate))];
        const sample = parsedData
          .slice(0, 3)
          .map(
            (r) =>
              `${r.unit} (${r.estate}) → Rent: ${r.rent}, Paid: ${r.paid}, Bal: ${r.balance}`
          )
          .join("\n");

        await sendSafeMessage(
          ctx,
          `✅ Parsed ${parsedData.length} records.\n🏘️ Estates: ${estates.join(
            ", "
          )}\n📦 Sample:\n${sample}\n\n💬 Now ask questions like:\n• Who hasn’t paid?\n• Show total rent per estate\n• List top defaulters`
        );
      } catch (parseError) {
        console.error("Excel parse error:", parseError);
        ctx.reply("❌ Failed to parse the Excel file.");
      }
    });

    writer.on("error", () => {
      ctx.reply("❌ Failed to save the file.");
    });
  } catch (error) {
    console.error("File download error:", error);
    ctx.reply("❌ Failed to download the file.");
  }
});

// 💬 Handle natural language questions
bot.on("text", async (ctx) => {
  try {
    const question = ctx.message.text;
    const data = getRentalData();

    if (!data.length) {
      return ctx.reply("📂 Please upload your rental Excel file first.");
    }

    await ctx.reply("🤖 Thinking...");

    // Use a compact summary of units for Groq context
    const compactData = data
      .slice(0, 50) // only include first 50 rows for token safety
      .map(
        (d) =>
          `Estate: ${d.estate}, Unit: ${d.unit}, Rent: ${d.rent}, Paid: ${d.paid}, Balance: ${d.balance}`
      )
      .join("\n");

    const answer = await askGroq(question, compactData);
    await sendSafeMessage(ctx, `💬 ${answer}`);
  } catch (err) {
    console.error("GPT error:", err);
    ctx.reply("❌ Something went wrong while processing your question.");
  }
});

bot.launch();
console.log("🤖 Telegram bot is live");
