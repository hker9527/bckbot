import { Singleton } from '@app/Singleton';
import { enumStringKeys, req2json, round } from '@app/utils';
import { Currencies } from '@type/Database';
import { SlashCommand } from '@type/SlashCommand';
import assert from "assert";
import { MessageEmbed } from 'discord.js';

let lastUpdate: Date;
let data = Singleton.db.data!.currency;

async function worker() {
	let response;
	try {
		for (let i in data) {
			const c1 = i as keyof typeof Currencies;
			for (let j in data[c1]) {
				const c2 = j as keyof typeof Currencies;
				response = await req2json(`https://free.currconv.com/api/v7/convert?q=${i}_${j},${j}_${i}&compact=ultra&apiKey=${process.env.currency}`);
				assert(!isNaN(response[`${i}_${j}`]) && !isNaN(response[`${j}_${i}`]));
				data[c1][c2] = response[`${i}_${j}`];
				data[c2][c1] = response[`${j}_${i}`];
			}
		}

		lastUpdate = new Date();
		return true;
	} catch (e) {
		return false;
	}
}

worker();
setInterval(worker, 3600 * 1000);

export const module: SlashCommand = {
	name: "currency",
	description: "Spot currency conversion",
	options: [{
		name: "source",
		description: "From what currency",
		type: "STRING",
		choices: enumStringKeys(Currencies).map(currency => ({
			name: currency,
			value: currency
		}))
	}, {
		name: "amount",
		description: "How many money",
		type: "INTEGER",
		min_value: 1,
		optional: true
	}, {
		name: "target",
		description: "To what currency, defaults to all",
		type: "STRING",
		choices: enumStringKeys(Currencies).map(currency => ({
			name: currency,
			value: currency
		})),
		optional: true
	}],
	onCommand: async (interaction) => {
		const source = interaction.options.getString("source", true) as keyof typeof Currencies;
		const amount = interaction.options.getInteger("amount") ?? 1;
		const target = interaction.options.getString("target") as keyof typeof Currencies ?? null;

		const embed = new MessageEmbed({
			title: "Convert",
			fields: [
				{
					name: source,
					value: amount.toString()
				},
				...enumStringKeys(Currencies).filter(currency => currency != source && ((target != null && currency == target) || target == null)).map(currency => ({
					name: currency,
					value: round(data[source][currency as keyof typeof Currencies] * amount, 2).toString(),
					inline: true
				}))
			]
		});
		return await interaction.reply({
			embeds: [embed]
		});
	}
};
