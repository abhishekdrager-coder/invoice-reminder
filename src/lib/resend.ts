import { Resend } from "resend";
import { requireEmailEnv } from "@/lib/env";

export function getResendClient() {
	const { RESEND_API_KEY } = requireEmailEnv();
	return new Resend(RESEND_API_KEY);
}

export const resend = new Proxy({} as Resend, {
	get(_target, property) {
		const client = getResendClient();
		const value = Reflect.get(client as object, property, client);
		return typeof value === "function" ? value.bind(client) : value;
	},
});
