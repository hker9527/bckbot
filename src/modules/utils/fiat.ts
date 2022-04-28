import { enumStringKeys, req2json, round } from "@app/utils";
import { PrismaClient } from "@prisma/client";
import { Currency } from "@type/Currency";
import { SlashCommand } from "@type/SlashCommand";
import assert from "assert";
import { z } from "zod";

const prisma = new PrismaClient();

const worker = async () => {
	try {
		const updateInfo = await prisma.currencyUpdateInfo.create({ data: {} });
		const currencies = enumStringKeys(Currency);

		const requestPairs = [
			[...new Array(currencies.length - 1)].map((_, i) =>
				[...new Array(currencies.length - i - 1)].map((_, j) => [currencies[i], currencies[j + i + 1]]))
		].flat().flat();

		for (let i = 0; i < Math.floor(requestPairs.length / 2); i++) {
			const pairs = requestPairs.slice(i * 2, (i + 1) * 2);
			const response = await req2json(`https://free.currconv.com/api/v7/convert?q=${pairs.map(p => p.join("_")).join(",")}&compact=ultra&apiKey=${process.env.currency}`);
			const Z = z.object({
				[pairs[0].join("_")]: z.number(),
				[pairs[1].join("_")]: z.number()
			});
			const data = Z.safeParse(response);
			assert(data.success);

			for (const pair of pairs) {
				await prisma.currencyRecord.create({
					data: {
						src: pair[0],
						dst: pair[1],
						value: data.data[`${pair[0]}_${pair[1]}`],
						updateInfo: {
							connect: {
								id: updateInfo.id
							}
						}
					}
				});
			}
		}

		return true;
	} catch (e) {
		return false;
	}
}

worker();
setInterval(worker, 3600 * 1000);

export const module: SlashCommand = {
	name: "currency",
	description: {
		key: "fiat.description"
	},
	options: [{
		name: "source",
		description: {
			key: "fiat.sourceDescription"
		},
		type: "STRING",
		choices: enumStringKeys(Currency).map(currency => ({
			name: currency,
			value: currency
		}))
	}, {
		name: "amount",
		description: {
			key: "fiat.amountDescription"
		},
		type: "NUMBER",
		min_value: 1,
		optional: true
	}, {
		name: "target",
		description: {
			key: "fiat.targetDescription"
		},
		type: "STRING",
		choices: enumStringKeys(Currency).map(currency => ({
			name: currency,
			value: currency
		})),
		optional: true
	}],
	onCommand: async (interaction) => {
		const source = interaction.options.getString("source", true) as keyof typeof Currency;
		const amount = interaction.options.getNumber("amount") ?? 1;
		const target = interaction.options.getString("target") as keyof typeof Currency ?? null;

		const currencies = enumStringKeys(Currency);

		const records = await prisma.currencyRecord.findMany({
			where: {
				OR: [
					{
						src: source
					},
					{ 
						dst: source
					}
				]
			},
			orderBy: {
				updateInfo: {
					time: "desc"
				}
			},
			include: {
				updateInfo: true
			},
			take: currencies.length - 1
		});

		assert(records.length === currencies.length - 1);

		return {
			embeds: [{
				title: "Convert",
				fields: [
					{
						name: source,
						value: amount.toString()
					},
					...records
						.filter(record => target === null ? true : record.dst === target || record.src === target)
						.map(record => {
							// Assumption: src -> dst = 1 / dst -> src

							const inverseFlag = record.dst === source;
							return {
								name: inverseFlag ? record.src : record.dst,
								value: `${round((inverseFlag ? 1 / record.value : record.value) * amount, 3)}`,
								inline: true
							}
						})
				],
				footer: {
					text: "Updated at"
				},
				timestamp: records[0].updateInfo.time
			}]
		};
	}
};