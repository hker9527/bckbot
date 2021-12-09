import { onFn, SlashCommandResult } from "@type/SlashCommand";

export const SlashCommandResultAdapter = (result: Awaited<ReturnType<onFn<any>>>): SlashCommandResult => {
     if (typeof result === "string" || "key" in result) {
          return { content: result };
     } else {
          return result;
     }
}