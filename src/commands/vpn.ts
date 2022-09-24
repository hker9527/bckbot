import { arr2obj } from "@app/utils";
import { Command } from "@type/Command";
import { MessageAttachment } from "discord.js";
import fetch from "node-fetch";

const getFlagEmoji = (countryCode: string) => {
	const codePoints = countryCode
		.toUpperCase()
		.split("")
		.map(char => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
};

const hosts = {
	hk: "http://127.0.0.1:3000",
	us: "http://nasuvps.ddns.net:3000"
};

const sites = ["uma", "wf", "kc", "knsb", "krr"];

export const command: Command = {
	defer: true,
	name: "vpn",
	options: {
		game: {
			type: "STRING",
			required: true,
			choices: arr2obj(sites, sites)
		},
		server: {
			type: "STRING",
			choices: arr2obj(Object.keys(hosts), Object.keys(hosts))
		}
	},
	onCommand: async (interaction) => {
		const game = interaction.options.getString("game", true);
		const server = (interaction.options.getString("server") || "hk") as keyof typeof hosts;
		const host = hosts[server];
		const response = await fetch(`${host}/site/${game}`);

		const servers: {
			ip: string;
			country: string;
			speed: number;
			ping: number;
		}[] = await response.json();

		return {
			content: `Retrieved ${servers.length} servers.`,
			components: [
				[
					{
						type: "SELECT_MENU",
						custom_id: "uwu",
						options: servers.map(server => ({
							label: `${server.ip} ${((server.speed / 1024 / 1024 * 1000) | 0) / 1000} Mbps - ${server.ping}ms`,
							value: `${host}_${server.ip}_${game}`,
							emoji: getFlagEmoji(server.country) ?? "🏳️"
						}))
					}
				]
			]
		};
	},
	onSelectMenu: async (interaction) => {
		const [host, ip, game] = interaction.values[0].split("_");
		const response = await fetch(`${host}/ip/${ip}`);

		const server: ({
			ip: string
			hostname: string
			country: string
			uptime: number
			totalUsers: number
			totalTraffic: number
			speed: number
			config: string
			isp: string | null
		} & {
			test: {
				time: Date;
				results: {
					site: string;
					ping: number;
				}[];
			};
		}) | null = await response.json();

		if (!server) {
			return {
				content: "Server not found."
			};
		}

		const configFile = new MessageAttachment(Buffer.from(server.config, "base64"), `Nasu-${new Date().toISOString()}-${server.ip}.ovpn`);

		return {
			embeds: [
				{
					title: server.hostname,
					fields: [
						{
							name: "IP",
							value: server.ip,
							inline: true
						}, {
							name: "Speed",
							value: `${((server.speed / 1024 / 1024 * 1000) | 0) / 1000} Mbps`,
							inline: true
						}, {
							name: "ISP",
							value: server.isp ?? "Unknown"
						}, {
							name: "VPN ping",
							value: `${server.test.results.find(result => result.site === "connect")?.ping}ms` ?? "Unknown",
							inline: true
						}, {
							name: "Game ping",
							value: `${server.test.results.find(result => result.site === game)?.ping}ms` ?? "Unknown",
							inline: true
						}
					],
					footer: {
						text: "Tested at"
					},
					timestamp: server.test.time
				}
			],
			files: [configFile]
		};
	}
};
