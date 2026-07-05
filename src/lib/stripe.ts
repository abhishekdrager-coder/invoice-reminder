import Stripe from "stripe";
import { requireStripeEnv } from "@/lib/env";

export function getStripeClient() {
  const { STRIPE_SECRET_KEY } = requireStripeEnv();
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property) {
    const client = getStripeClient();
    const value = Reflect.get(client as object, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
