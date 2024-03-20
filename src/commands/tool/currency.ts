import { arr2obj, round } from "@app/utils";
import { SlashApplicationCommand } from "@class/ApplicationCommand";
import type { LApplicationCommandOptionData } from "@class/ApplicationCommandOptionData";
import type { LInteractionReplyOptions } from "@localizer/InteractionReplyOptions";
import { Zod } from "@type/Zod";
import assert from "assert-ts";
import type { ChatInputCommandInteraction } from "discord.js";
import { z } from "zod";
import { Logger } from "tslog";

const logger = new Logger({
	name: "currency",
	minLevel: process.env.DEV === "true" ? 0 : 3
});

const currencies = [
	"TWD", "HKD", "JPY", "USD", "EUR"
];

const lastUpdated = new Date(0);
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
		if (process.env.DEV === "true") {
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

		quotes = {};

		for (let i = 0; i < currencies.length - 1; i++) {
			const currency = currencies[i];

			const response = await fetch(`http://api.exchangerate.host/live?access_key=${process.env.exchangerate_key}&source=${currency}&currencies=${currencies.join(",")}`)
				.then(res => res.json());
			
			sublogger.trace(response);

			const Z = new Zod(z.object({
				success: z.literal(true),
				source: z.literal(currency),
				quotes: z.object(arr2obj(currencies.map(c => currency + c), currencies.map(_ => z.number())))
			}));
			assert(Z.check(response));

			quotes = {
				...quotes,
				...response.quotes
			};
		}

		return true;
	} catch (e) {
		sublogger.error(e);
		return false;
	}
}

worker();
setInterval(worker, 86400 * 2 * 1000);

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

	public async onCommand(interaction: ChatInputCommandInteraction): Promise<LInteractionReplyOptions> {
		const source = interaction.options.getString("source", true);
		const amount = interaction.options.getNumber("amount") ?? 1;
		const target = interaction.options.getString("target") ?? null;

		return {
			embeds: [{
				title: "Convert",
				fields: [
					{
						name: {
							key: `currency._${source}_name`
						},
						value: amount.toString()
					},
					{
						name: target ? {
							key: `currency._${target}_name`
						} : "All",
						value: target ? 
							getQuote(source, target, amount).toString() : 
							currencies.map(currency => `${currency}: ${getQuote(source, currency, amount)}`).join("\n")
					}
				],
				footer: {
					text: "Updated at"
				},
				timestamp: lastUpdated.toISOString()
			}]
		};
	}
};

export const currency = new Command({
	name: "currency"
});