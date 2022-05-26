import { StealthModule, StealthModuleActionArgument } from "@type/StealthModule";
import { APIScam } from "@type/api/Scam";
import { find } from "linkifyjs";
import fetch from "node-fetch";
import { getString } from "@app/Localizations";

export const module: StealthModule = {
	event: "messageCreate",
	action: async (obj: StealthModuleActionArgument) => {
		const urls = find(obj.message.content).filter(result => result.type === "url").map(result => result.href);
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
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body)
			});

			const json = await response.json() as APIScam;
			try {
				if (json.matches) {
					const txts = [];
					for (const match of json.matches) {
						txts.push(getString("scam.scam", obj.message.getLocale(), {
							link: match.threat.url,
							threatType: match.threatType,
							platformType: match.platformType,
							entryType: match.threatEntryType
						}));
					}
					return {
						type: "reply",
						result: {
							content: txts.join("\n")
						}
					}
				}
			} catch (e) {
				console.error(e);
			}
		}
		return false;
	}
};