import OpenAI from "openai";
import { requireAIEnv } from "@/lib/env";

export function getOpenAIClient() {
	const { OPENAI_API_KEY } = requireAIEnv();
	return new OpenAI({ apiKey: OPENAI_API_KEY });
}

export const openai = new Proxy({} as OpenAI, {
	get(_target, property) {
		const client = getOpenAIClient();
		const value = Reflect.get(client as object, property, client);
		return typeof value === "function" ? value.bind(client) : value;
	},
});
