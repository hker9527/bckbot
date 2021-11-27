import { getString } from "@app/i18n";
import * as utils from '@app/utils';
import { findImagesFromMessage } from '@module/images/_lib';
import { ContextMenuCommand } from "@type/SlashCommand";

const deepai = require("deepai");

deepai.setApiKey(process.env.deepai);

const colorByRatio = (_ratio: number): `#${string}` => {
	const colors = {
		safe: "28a745",
		warning: "ffc107",
		danger: "dc3545"
	};

	const start = _ratio >= 0.5 ? colors.warning : colors.safe;
	const end = _ratio >= 0.5 ? colors.danger : colors.warning;

	// Map the two portions [0,0.5) and (0.5,1] into [0,1]
	const ratio = (_ratio % 0.5) * 2;

	const hex = (x: number) => {
		return x.toString(16).padStart(2, '0');
	};

	const r = Math.ceil(parseInt(start.substring(0, 2), 16) * (1 - ratio) + parseInt(end.substring(0, 2), 16) * ratio);
	const g = Math.ceil(parseInt(start.substring(2, 4), 16) * (1 - ratio) + parseInt(end.substring(2, 4), 16) * ratio);
	const b = Math.ceil(parseInt(start.substring(4, 6), 16) * (1 - ratio) + parseInt(end.substring(4, 6), 16) * ratio);

	return `#${hex(r)}${hex(g)}${hex(b)}`;
};

export const module: ContextMenuCommand = {
	name: "nudity.name",
	type: "MESSAGE",
	onContextMenu: async (interaction) => {
		await interaction.deferReply();
		let url: string;
		const urls = findImagesFromMessage(interaction.getMessage());

		if (!urls.length) {
			return await interaction.editReply(getString("nudity.invalidMessage", interaction.getLocale()));
		}

		url = urls[0];

		const resp = await deepai.callStandardApi("nsfw-detector", {
			image: url
		});

		const score = utils.round(resp.output.nsfw_score * 100);
		return await interaction.editReply(
			{
				embeds: [{
					color: colorByRatio(score / 100),
					title: `${score}%`,
					thumbnail: { url },
					fields: resp.output.detections.length ?
						[
							{
								name: getString("nudity.items", interaction.getLocale()),

								value: resp.output.detections.sort((d1: any, d2: any) => d1.confidence > d2.confidence ? -1 : 1).map((detection: any) =>
									`(${utils.round(detection.confidence * 100)}%) ${detection.name}`
								).join("\n")
							}
						] : undefined
				}]
			}
		);
	}
};