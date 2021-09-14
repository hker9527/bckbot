import { MessageEmbed } from "discord.js";
import { Module, ArgumentRequirement, ModuleActionArgument } from "@type/Module";
import * as i18n from "@app/i18n";

export const module: Module = {
	trigger: ["ava", "avatar"],
	event: "messageCreate",
	argv: {
		"user": [ArgumentRequirement.Required]
	},
	action: async (obj: ModuleActionArgument) => {
		let user = obj.message.mentions.users.first();
		if (!user) {
			let member = (await obj.message.guild!.members.fetch({query: obj.argv!.user, limit: 1})).first();

			if (member) {
				user = member.user;
			} else {
				return await obj.message.reply(i18n.getString("avatar", "memberNotFound", obj.message.getLocale()));
			}
		}

		const avatarURL = user.avatarURL({
			format: "png",
			dynamic: true,
			size: 4096
		});

		if (!avatarURL) {
			return await obj.message.reply(i18n.getString("avatar", "avatarNotFound", obj.message.getLocale()));
		}

		const embed = new MessageEmbed()
			.setDescription(`[URL](${avatarURL})`)
			.setAuthor(`${user.username}'s avatar`)
			.setColor("#8dd272");

		if (obj.trigger === "ava") {
			embed.setThumbnail(avatarURL);
		} else {
			embed.setImage(avatarURL);
		}

		return await obj.message.channel.send({embeds: [embed]});
	}
};
