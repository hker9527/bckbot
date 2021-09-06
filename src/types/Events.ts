import { Dictionary } from "./Dictionary";
import { Module } from "./Module";

export type Events = Dictionary<Dictionary<{
	module: Module,
	loaded: boolean
}>>