import { Module, ModuleActionArgument } from "@app/types/Module";
import { ScamApiResponse } from "@app/types/ScamApiResponse";
import * as linkify from 'linkifyjs';
import fetch from "node-fetch";
import * as i18n from "../i18n";

export const module: Module = {
	trigger: ["*scam"],
	event: "messageCreate",
	action: async (obj: ModuleActionArgument) => {
		const urls = linkify.find(obj.message.content).filter(result => result.type === "url").map(result => result.href);
		if (urls.length) {
			const body = {
				"client": {
					"clientId": "bckbot",
					"clientVersion": "1.0.0"
				},
				"threatInfo": {
					"threatTypes": ["THREAT_TYPE_UNSPECIFIED", "MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
					"platformTypes": ["ALL_PLATFORMS"],
					"threatEntryTypes": ["URL", "EXECUTABLE"],
					"threatEntries": urls.map(url => { return { url }; })
				}
			};

			const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.safebrowsing_key}`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			try {
				const json = await response.json() as ScamApiResponse;
				if (json.matches) {
					const txt = "";
					return await obj.message.reply(JSON.stringify(json.matches));
				}
			} catch (e) {
				console.error(await response.json());
			}
		}
		return false;
	}
};