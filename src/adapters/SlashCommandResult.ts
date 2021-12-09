import { onFn, SlashCommandResult } from "@type/SlashCommand";

export const SlashCommandResultAdapter = (result: Awaited<ReturnType<onFn<any>>>): SlashCommandResult => {
     return typeof result === "string" ? { content: result } : result;
};