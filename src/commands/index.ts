import type { BaseApplicationCommand } from "@class/ApplicationCommand";
import type { ApplicationCommandType } from "discord.js";

import { mine } from "./fun/mine";
import { ask } from "./misc/ask";
import { _delete } from "./misc/delete";
import { invite } from "./misc/invite";
import { ping } from "./misc/ping";
import { slap } from "./misc/slap";
import { avatar } from "./tool/avatar";
import { choice } from "./tool/choice";
import { currency } from "./tool/currency";
import { dice } from "./tool/dice";
import { roll } from "./tool/roll";
import { sauce } from "./tool/sauce";
import { forgetme } from "./setting/forgetme";
import { ignoreme } from "./setting/ignoreme";
import { language } from "./setting/language";

export const commands: BaseApplicationCommand<ApplicationCommandType>[] = [
	mine,
	ask,
	_delete,
	invite,
	ping,
	slap,
	avatar,
	choice,
	currency,
	dice,
	roll,
	sauce,
	forgetme,
	ignoreme,
	language
];