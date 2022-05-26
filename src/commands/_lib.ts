import { Collection, Message } from "discord.js";

export const findImagesFromMessage = (message: Message) => {
	// Attachment shows first, then embeds.
	return [
		...message.attachments.map(attachment => attachment.url),
		...message.embeds.filter(embed => embed.thumbnail || embed.image).map(embed => embed.thumbnail?.url ?? embed.image?.url ?? embed.url)
	] as string[];
}

export const findImageFromMessages = (index: number, msgs: Collection<string, Message>) => {
	// Precedence: URL > Embeds > Attachments

	let i = 0;
	let url: string | null = null;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	for (const [_, msg] of msgs.filter(a => a.author.id !== a.client.user!.id)) {
		for (const embed of msg.embeds.reverse()) {
			if (i === index) {
				if (embed.thumbnail) {
					url = embed.thumbnail.url;
					break;
				} else if (embed.image) {
					url = embed.image.url;
					break;
				}
			} else {
				i++;
			}
		}

		if (url) return url;

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (const [_, attachment] of msg.attachments) {
			if (attachment.width && attachment.width > 0) {
				if (i === index) {
					url = attachment.url;
					break;
				} else {
					i++;
				}
			}
		}

		if (url) return url;
	}

	return null;
};