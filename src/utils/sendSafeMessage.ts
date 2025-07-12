export async function sendSafeMessage(ctx: any, message: string) {
  const MAX_LENGTH = 4000;

  if (message.length <= MAX_LENGTH) {
    return ctx.reply(message);
  }

  const chunks = message.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g"));
  if (!chunks) return;

  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}
