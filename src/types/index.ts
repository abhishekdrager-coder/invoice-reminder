export * from "./database";

export type PlanLimits = {
  invoiceLimit: number;
  reminderLimit: number;
  aiRewriteLimit: number;
};

export type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
  redirectTo?: string;
};

export type NavItem = {
  href: string;
  label: string;
  description?: string;
};
