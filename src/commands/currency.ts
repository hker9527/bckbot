import { arr2obj, enumStringKeys, req2json, round } from "@app/utils";
import { PrismaClient } from "@prisma/client";
import { Command } from "@type/Command";
import { Currency } from "@type/Currency";
import assert from "assert";
import { z } from "zod";

const prisma = new PrismaClient();

const worker = async () => {
	try {
		const updateInfo = await prisma.currencyUpdateInfo.create({ data: {} });
		const currencies = enumStringKeys(Currency);

		for (let i = 0; i < currencies.length - 1; i++) {
			const currency = currencies[i];
			const otherCurrencies = currencies.filter((_, ii) => ii > i);

			const response = await req2json(`https://api.exchangerate.host/latest?base=${currency}&symbols=${otherCurrencies.join(",")}`);
			const Z = z.object({
				success: z.literal(true),
				rates: z.object(arr2obj(otherCurrencies, otherCurrencies.map(_ => z.number())))
			});
			const data = Z.safeParse(response);
			assert(data.success);

			for (const _currency of otherCurrencies) {
				await prisma.currencyRecord.create({
					data: {
						src: currency,
						dst: _currency,
						value: data.data.rates[_currency],
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

export const command: Command = {
	defer: true,
	name: "currency",
	options: {
		source: {
			type: "STRING",
			required: true,
			choices: arr2obj(enumStringKeys(Currency), enumStringKeys(Currency))
		},
		amount: {
			type: "NUMBER",
			min: 1
		},
		target: {
			type: "STRING",
			choices: arr2obj(enumStringKeys(Currency), enumStringKeys(Currency))
		}
	},
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
					}, {
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