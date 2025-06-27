import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";

import { parseRentalExcel } from "../parser/excelParser"; // <-- Import the parser

dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.start((ctx) => {
  ctx.reply(
    `👋 Hello ${ctx.from.first_name}! Welcome to the Rental AI Assistant! Please upload your Excel file to begin.`
  );
});

// Handle Excel file upload
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

    // Save to local file system
    const writer = fs.createWriteStream(uploadPath);
    response.data.pipe(writer);

    writer.on("finish", async () => {
      ctx.reply("✅ Excel file received! Parsing data...");

      try {
        const parsedData = await parseRentalExcel(uploadPath);

        if (!parsedData.length) {
          return ctx.reply(
            "⚠️ No valid rental entries found in the Excel file."
          );
        }

        ctx.reply(
          `✅ Successfully parsed ${parsedData.length} entries from the Excel file.\nYou can now ask questions like:\n\n• Who hasn’t paid?\n• What is total rent for April?\n• Show top defaulters`
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

bot.launch();
console.log("🤖 Telegram bot is live");
