import { round } from "@app/utils";
import { t } from "@app/i18n/token";
import { SlashApplicationCommand } from "@class/ApplicationCommand";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { InteractionReplyOptions } from "discord.js";
import { Zod } from "@type/Zod";
import assert from "assert-ts";
import type { ChatInputCommandInteraction } from "discord.js";
import { z } from "zod";
import { createLogger } from "@app/sentry";

const logger = createLogger({
	name: "currency",
	minLevel: Bun.env.DEV === "true" ? 0 : 3
});

const currencies = [
	"TWD", "HKD", "JPY", "USD", "EUR"
];

// fawazahmed0/exchange-api: no key, no rate limit, CDN-hosted JSON.
// Cross rates computed from a single USD-based fetch.
const base = "USD";
const cdnUrls = [
	`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`,
	`https://latest.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.json`
];

let lastUpdated = new Date(0);
let quotes: Record<string, number> = {};

const getQuote = (source: string, target: string, amount: number) => {
	if (source === target) {
		return 1;
	}

	return round(quotes[source + target] * amount, 3);
};

const worker = async () => {
	const sublogger = logger.getSubLogger({
		name: "worker"
	});

	try {
		if (Bun.env.DEV === "true") {
			logger.debug("Using mock data");
			quotes = {
				"TWDHKD": 0.25,
				"TWDJPY": 3.5,
				"TWDUSD": 0.035,
				"TWDEUR": 0.03,
				"HKDTWD": 4,
				"HKDJPY": 14,
				"HKDUSD": 0.14,
				"HKDEUR": 0.12,
				"JPYTWD": 0.285,
				"JPYHKD": 0.071,
				"JPYUSD": 0.009,
				"JPYEUR": 0.008,
				"USDTWD": 28.5,
				"USDHKD": 7,
				"USDJPY": 110,
				"USDEUR": 0.85,
				"EURTWD": 33.5,
				"EURHKD": 8.5,
				"EURJPY": 130,
				"EURUSD": 1.18
			};

			return true;
		}

		let response: unknown;
		for (const url of cdnUrls) {
			try {
				response = await fetch(url).then(res => res.json());
				break;
			} catch (e) {
				sublogger.warn(`Fetch failed: ${url}`, e);
			}
		}

		sublogger.trace(response);

		// { date, usd: { twd: 30.1, hkd: 7.8, ... } }
		const Z = new Zod(z.object({
			[base.toLowerCase()]: z.record(z.string(), z.number())
		}));
		assert(Z.check(response));

		const rates = response[base.toLowerCase()];

		// 1 source = rates[target] / rates[source] target
		quotes = {};
		for (const source of currencies) {
			for (const target of currencies) {
				if (source === target) {
					continue;
				}

				const sRate = rates[source.toLowerCase()];
				const tRate = rates[target.toLowerCase()];
				assert(typeof sRate === "number" && typeof tRate === "number");

				quotes[source + target] = tRate / sRate;
			}
		}

		lastUpdated = new Date();

		return true;
	} catch (e) {
		sublogger.error(e);
		return false;
	}
}

worker();
setInterval(worker, 86400 * 1000);

class Command extends SlashApplicationCommand {
	public options: LApplicationCommandOptionData[] = [
		{
			name: "source",
			type: "String",
			required: true,
			choices: currencies.map(currency => ({
				name: currency,
				value: currency
			}))
		},
		{
			name: "amount",
			type: "Number",
			minValue: 1
		},
		{
			name: "target",
			type: "String",
			choices: currencies.map(currency => ({
				name: currency,
				value: currency
			}))
		}
	];

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
		const source = interaction.options.getString("source", true);
		const amount = interaction.options.getNumber("amount") ?? 1;
		const target = interaction.options.getString("target") ?? null;

		return {
			embeds: [{
				title: t("currency.title"),
				fields: [
					{
						name: t(`currency._${source}_name`),
						value: amount.toString()
					},
					{
						name: target ? t(`currency._${target}_name`) : t("currency.all"),
						value: target ?
							getQuote(source, target, amount).toString() : 
							currencies.map(currency => `${currency}: ${getQuote(source, currency, amount)}`).join("\n")
					}
				],
				footer: {
					text: t("currency.updatedAt")
				},
				timestamp: lastUpdated.toISOString()
			}]
		};
	}
};

export const currency = new Command({
	name: "currency"
});