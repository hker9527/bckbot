import { error } from "@app/Reporting";
import { round } from "@app/utils";
import { Command } from "@type/Command";
import FormData from "form-data";
import fetch from "node-fetch";

import { findImagesFromMessage } from "./_lib";

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
		return x.toString(16).padStart(2, "0");
	};

	const r = Math.ceil(parseInt(start.substring(0, 2), 16) * (1 - ratio) + parseInt(end.substring(0, 2), 16) * ratio);
	const g = Math.ceil(parseInt(start.substring(2, 4), 16) * (1 - ratio) + parseInt(end.substring(2, 4), 16) * ratio);
	const b = Math.ceil(parseInt(start.substring(4, 6), 16) * (1 - ratio) + parseInt(end.substring(4, 6), 16) * ratio);

	return `#${hex(r)}${hex(g)}${hex(b)}`;
};

const query = async (url: string) => {
	try {
		const form = new FormData();
		form.append("image", url);

		const resp = await fetch("https://api.deepai.org/api/nsfw-detector", {
			method: "POST",
			headers: {
				"Api-Key": process.env.deepai!
			},
			body: form
		});

		if (!resp.ok) {
			return {
				content: await resp.text()
			}
		};

		const result = await resp.json() as any;

		const score = round(result.output.nsfw_score * 100);
		return {
			content: " ", // Clear the prompt
			embeds: [{
				color: colorByRatio(score / 100),
				title: `${score}%`,
				thumbnail: url,
				fields: result.output.detections.length ?
					[
						{
							name: {
								key: "nudity.items"
							},

							value: result.output.detections.sort((d1: any, d2: any) => d1.confidence > d2.confidence ? -1 : 1).map((detection: any) =>
								`(${round(detection.confidence * 100)}%) ${detection.name}`
							).join("\n")
						}
					] : undefined
			}]
		};
	} catch (e) {
		error("nudity", e);
		return {
			content: "uwu" // Clear the prompt
		};
	}
};

export const command: Command = {
	defer: true,
	name: "nudity",
	type: "MESSAGE",
	onContextMenu: async (interaction) => {
		let url: string;
		const urls = findImagesFromMessage(interaction.getMessage());

		if (!urls.length) {
			return {
				content: {
					key: "nudity.invalidMessage"
				}
			};
		} else if (urls.length > 1) {
			return {
				content: {
					key: "nudity.multipleImages"
				},
				components: [
					[
						{
							type: "SELECT_MENU",
							options: urls.map((url, i) => ({
								label: `${i + 1}. ${url}`,
								value: url
							})),
							custom_id: "pickURL"
						}
					]
				]
			}
		} else {
			url = urls[0];
		}

		return query(url);
	},
	onSelectMenu: async (interaction) => {
		const url = interaction.values[0];
		return query(url);
	}
};