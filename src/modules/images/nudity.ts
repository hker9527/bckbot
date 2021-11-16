import * as utils from '@app/utils';
import { findImagesFromMessage } from '@module/images/_lib';
import { ContextMenuCommand } from "@type/SlashCommand";

const deepai = require("deepai");

deepai.setApiKey(process.env.deepai);

export const module: ContextMenuCommand = {
	name: "nudity",
	type: "MESSAGE",
	onContextMenu: async (interaction) => {
		await interaction.deferReply();
		let url;
		const urls = findImagesFromMessage(interaction.getMessage());

		if (!urls.length) {
			return await interaction.editReply("Provided URL is not image or index!");
		}

		url = urls[0];

		const resp = await deepai.callStandardApi("nsfw-detector", {
			image: url
		});

		const score = utils.round(resp.output.nsfw_score * 100);
		return await interaction.editReply(
			(score < 10 ? "🟢" : (score < 50 ? "🟡" : "🔴")) + "\t" +
			score + "% NSFW detected." +
			(resp.output.detections.length ?
				("\n```\n" + resp.output.detections.map((a: any) => "(" + utils.round(a.confidence) * 100 + "%)\t" + a.name + " at (" + a.bounding_box[0] + ", " + a.bounding_box[1] + ") " + a.bounding_box[2] + "x" + a.bounding_box[3]).join("\n")) + "\n```" :
				"")
		);
	}
};