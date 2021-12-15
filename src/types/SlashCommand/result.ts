import { Localizable } from "@app/localizers/Data";
import { InteractionReplyOptions } from "discord.js";
import { LocalizableMessage } from "@localizer/MessageFields";
import { Result } from "@type/Message/Result";

export type SlashCommandResultType = LocalizableMessage<InteractionReplyOptions>;

export class SlashCommandResult extends Result<InteractionReplyOptions> {
	constructor(__result: SlashCommandResultType | Localizable, id: string) {
		super(__result, `i${id}`);
	}
};